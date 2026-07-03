package com.stockflow.hq.domain.order.service;

import com.stockflow.hq.domain.order.dto.OrderRequestDto;
import com.stockflow.hq.domain.order.dto.OrderResponseDto;
import com.stockflow.hq.domain.order.entity.Order;
import com.stockflow.hq.domain.order.entity.OrderItem;
import com.stockflow.hq.domain.order.entity.OrderStatus;
import com.stockflow.hq.domain.order.repository.OrderItemRepository;
import com.stockflow.hq.domain.order.repository.OrderRepository;
import com.stockflow.hq.domain.product.entity.ProductOption;
import com.stockflow.hq.domain.product.repository.ProductOptionRepository;
import com.stockflow.hq.domain.stockhistory.entity.StockHistoryReason;
import com.stockflow.hq.domain.stockhistory.entity.StockHistoryType;
import com.stockflow.hq.domain.stockhistory.service.StockHistoryService;
import com.stockflow.hq.domain.store.entity.Store;
import com.stockflow.hq.domain.store.entity.StoreStock;
import com.stockflow.hq.domain.store.repository.StoreRepository;
import com.stockflow.hq.domain.store.repository.StoreStockRepository;
import com.stockflow.hq.domain.user.entity.User;
import com.stockflow.hq.domain.user.repository.UserRepository;
import com.stockflow.hq.domain.warehouse.entity.Warehouse;
import com.stockflow.hq.domain.warehouse.entity.WarehouseStock;
import com.stockflow.hq.domain.warehouse.repository.WarehouseStockRepository;
import com.stockflow.hq.global.exception.BusinessException;
import com.stockflow.hq.global.exception.ErrorCode;
import com.stockflow.hq.global.websocket.StockWebSocketService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final ProductOptionRepository productOptionRepository;
    private final WarehouseStockRepository warehouseStockRepository;
    private final StoreStockRepository storeStockRepository;
    private final StockHistoryService stockHistoryService;
    private final StockWebSocketService stockWebSocketService;
    // 발주 요청
    @Transactional
    public OrderResponseDto create(OrderRequestDto request, String email) {
        Store store = storeRepository.findById(request.getStoreId())
                .orElseThrow(() -> new BusinessException(ErrorCode.STORE_NOT_FOUND));

        // JWT 토큰에서 추출한 이메일로 요청자 조회
        User requestedBy = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        Order order = Order.builder()
                .store(store)
                .status(OrderStatus.REQUESTED)
                .requestedBy(requestedBy)
                .note(request.getNote())
                .build();

        Order saved = orderRepository.save(order);

        for (OrderRequestDto.OrderItemDto itemDto : request.getItems()) {
            ProductOption productOption = productOptionRepository.findById(itemDto.getProductOptionId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.PRODUCT_OPTION_NOT_FOUND));

            OrderItem item = OrderItem.builder()
                    .order(saved)
                    .productOption(productOption)
                    .quantity(itemDto.getQuantity())
                    .build();

            orderItemRepository.save(item);
        }

        // 본사 대시보드 + 발주 목록 화면이 새로고침 없이 즉시 갱신되도록 알림
        stockWebSocketService.sendDashboardUpdate();
        stockWebSocketService.sendOrderUpdate(saved.getId(), OrderStatus.REQUESTED.name());

        return OrderResponseDto.from(saved, orderItemRepository.findByOrderId(saved.getId()));
    }


    // 발주 전체 조회
    public List<OrderResponseDto> findAll() {
        return orderRepository.findAll().stream()
                .map(order -> OrderResponseDto.from(order,
                        orderItemRepository.findByOrderId(order.getId())))
                .collect(Collectors.toList());
    }

    // 발주 단건 조회
    public OrderResponseDto findById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.ORDER_NOT_FOUND));
        return OrderResponseDto.from(order, orderItemRepository.findByOrderId(id));
    }

    // 발주 승인 → 지정 창고 재고를 예약(reserve)만 해두고, 실물재고는 출고(ship) 시점에 차감
    @Transactional
    public OrderResponseDto approve(Long id, Long approvedById) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.ORDER_NOT_FOUND));

        if (order.getStatus() != OrderStatus.REQUESTED) {
            throw new BusinessException(ErrorCode.ORDER_INVALID_STATUS);
        }

        User approvedBy = userRepository.findById(approvedById)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        Warehouse warehouse = order.getStore().getWarehouse();
        if (warehouse == null) {
            throw new BusinessException(ErrorCode.STORE_WAREHOUSE_NOT_ASSIGNED);
        }

        List<OrderItem> items = orderItemRepository.findByOrderId(id);

        // 가용재고(실물재고 - 이미 예약된 수량) 기준으로 확인.
        // 다른 매장의 승인된 발주가 이미 예약해둔 물량은 이중으로 배정되지 않도록 함.
        for (OrderItem item : items) {
            WarehouseStock warehouseStock = warehouseStockRepository
                    .findByWarehouseIdAndProductOptionId(warehouse.getId(), item.getProductOption().getId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.WAREHOUSE_STOCK_NOT_FOUND));

            if (warehouseStock.getAvailableQuantity() < item.getQuantity()) {
                throw new BusinessException(ErrorCode.WAREHOUSE_STOCK_INSUFFICIENT);
            }
        }

        // 검증 통과 → 실물재고는 그대로 두고 예약 수량만 걸어둠 (아직 창고에서 안 나간 상태)
        for (OrderItem item : items) {
            WarehouseStock warehouseStock = warehouseStockRepository
                    .findByWarehouseIdAndProductOptionId(warehouse.getId(), item.getProductOption().getId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.WAREHOUSE_STOCK_NOT_FOUND));

            warehouseStock.reserve(item.getQuantity());
        }

        // 매장 쪽엔 "출고 준비중"으로 보이지만, 실제 데이터는 APPROVED 그대로
        order.updateStatus(OrderStatus.APPROVED, approvedBy);

        stockWebSocketService.sendDashboardUpdate();
        stockWebSocketService.sendOrderUpdate(id, OrderStatus.APPROVED.name());

        return OrderResponseDto.from(order, items);
    }


    // 발주 반려
    @Transactional
    public OrderResponseDto reject(Long id, Long approvedById) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.ORDER_NOT_FOUND));

        if (order.getStatus() != OrderStatus.REQUESTED) {
            throw new BusinessException(ErrorCode.ORDER_INVALID_STATUS);
        }

        User approvedBy = userRepository.findById(approvedById)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        order.updateStatus(OrderStatus.REJECTED, approvedBy);
        stockWebSocketService.sendOrderUpdate(id, OrderStatus.REJECTED.name());
        return OrderResponseDto.from(order, orderItemRepository.findByOrderId(id));
    }

    // 발주 출고
    @Transactional
    public OrderResponseDto ship(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.ORDER_NOT_FOUND));

        if (order.getStatus() != OrderStatus.APPROVED) {
            throw new BusinessException(ErrorCode.ORDER_INVALID_STATUS);
        }

        Warehouse warehouse = order.getStore().getWarehouse();
        if (warehouse == null) {
            throw new BusinessException(ErrorCode.STORE_WAREHOUSE_NOT_ASSIGNED);
        }

        List<OrderItem> items = orderItemRepository.findByOrderId(id);

        for (OrderItem item : items) {
            WarehouseStock warehouseStock = warehouseStockRepository
                    .findByWarehouseIdAndProductOptionId(warehouse.getId(), item.getProductOption().getId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.WAREHOUSE_STOCK_NOT_FOUND));

            // 실물재고 차감 + 예약 해제를 동시에 처리
            warehouseStock.confirmShipment(item.getQuantity());
            int updatedQty = warehouseStock.getQuantity();

            // 출고 후 남은 실물재고가 10개 이하면 본사에 저재고 알림
            if (updatedQty <= 10) {
                stockWebSocketService.sendLowStockAlert(
                        warehouse.getId(),
                        warehouse.getName(),
                        item.getProductOption().getSkuCode(),
                        updatedQty
                );
            }

            stockHistoryService.record(
                    null,
                    warehouse,
                    item.getProductOption(),
                    StockHistoryType.OUT,
                    StockHistoryReason.ORDER,
                    item.getQuantity(),
                    order.getApprovedBy()
            );
        }

        order.updateStatus(OrderStatus.SHIPPED, order.getApprovedBy());

        stockWebSocketService.sendDashboardUpdate();
        stockWebSocketService.sendOrderUpdate(id, OrderStatus.SHIPPED.name());

        return OrderResponseDto.from(order, items);
    }

    // 발주 입고완료
    @Transactional
    public OrderResponseDto receive(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.ORDER_NOT_FOUND));

        if (order.getStatus() != OrderStatus.SHIPPED) {
            throw new BusinessException(ErrorCode.ORDER_INVALID_STATUS);
        }

        List<OrderItem> items = orderItemRepository.findByOrderId(id);

        for (OrderItem item : items) {
            StoreStock storeStock = storeStockRepository
                    .findByStoreIdAndProductOptionId(
                            order.getStore().getId(),
                            item.getProductOption().getId())
                    .orElseGet(() -> StoreStock.builder()
                            .store(order.getStore())
                            .productOption(item.getProductOption())
                            .quantity(0)
                            .build());

            storeStock.updateQuantity(storeStock.getQuantity() + item.getQuantity());
            storeStockRepository.save(storeStock);

            stockHistoryService.record(
                    order.getStore(),
                    null,
                    item.getProductOption(),
                    StockHistoryType.IN,
                    StockHistoryReason.ORDER,
                    item.getQuantity(),
                    order.getApprovedBy()
            );
        }

        order.updateStatus(OrderStatus.RECEIVED, order.getApprovedBy());
        stockWebSocketService.sendOrderUpdate(id, OrderStatus.RECEIVED.name());
        return OrderResponseDto.from(order, items);
    }
}