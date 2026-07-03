package com.stockflow.hq.domain.warehouse.dto;

import com.stockflow.hq.domain.warehouse.entity.WarehouseStock;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.io.Serializable;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WarehouseStockResponseDto implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private Long warehouseId;
    private String warehouseName;
    private Long productOptionId;
    private String skuCode;
    private String productName;
    private String color;
    private String size;
    private int quantity;          // 실물재고
    private int reservedQuantity;  // 예약재고 (승인됐지만 아직 출고 안 된 수량)
    private int availableQuantity; // 가용재고 (= quantity - reservedQuantity)

    public static WarehouseStockResponseDto from(WarehouseStock warehouseStock) {
        return WarehouseStockResponseDto.builder()
                .id(warehouseStock.getId())
                .warehouseId(warehouseStock.getWarehouse().getId())
                .warehouseName(warehouseStock.getWarehouse().getName())
                .productOptionId(warehouseStock.getProductOption().getId())
                .skuCode(warehouseStock.getProductOption().getSkuCode())
                .productName(warehouseStock.getProductOption().getProduct().getName())
                .color(warehouseStock.getProductOption().getColor())
                .size(warehouseStock.getProductOption().getSize().getName())
                .quantity(warehouseStock.getQuantity())
                .reservedQuantity(warehouseStock.getReservedQuantity())
                .availableQuantity(warehouseStock.getAvailableQuantity())
                .build();
    }
}