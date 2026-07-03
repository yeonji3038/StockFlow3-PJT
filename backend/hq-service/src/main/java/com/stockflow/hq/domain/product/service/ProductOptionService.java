package com.stockflow.hq.domain.product.service;

import com.stockflow.hq.domain.product.dto.ProductOptionRequestDto;
import com.stockflow.hq.domain.product.dto.ProductOptionResponseDto;
import com.stockflow.hq.domain.product.entity.Product;
import com.stockflow.hq.domain.product.entity.ProductOption;
import com.stockflow.hq.domain.product.repository.ProductOptionRepository;
import com.stockflow.hq.domain.product.repository.ProductRepository;
import com.stockflow.hq.domain.size.entity.Size;
import com.stockflow.hq.domain.size.repository.SizeRepository;
import com.stockflow.hq.global.exception.BusinessException;
import com.stockflow.hq.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductOptionService {

    private final ProductOptionRepository productOptionRepository;
    private final ProductRepository productRepository;
    private final SizeRepository sizeRepository;

    // 상품 옵션 생성 (SKU 자동 생성: 상품코드 + 색상코드 + 사이즈코드)
    @Transactional
    public ProductOptionResponseDto create(Long productId, ProductOptionRequestDto request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PRODUCT_NOT_FOUND));
        Size size = sizeRepository.findById(request.getSizeId())
                .orElseThrow(() -> new BusinessException(ErrorCode.SIZE_NOT_FOUND));

        String skuCode = product.getProductCode() + request.getColorCode() + size.getSkuCode();

        ProductOption productOption = ProductOption.builder()
                .product(product)
                .color(request.getColor())
                .colorCode(request.getColorCode())
                .size(size)
                .skuCode(skuCode)
                .status(request.getStatus())
                .build();

        return ProductOptionResponseDto.from(productOptionRepository.save(productOption));
    }

    public List<ProductOptionResponseDto> findAllByProductId(Long productId) {
        return productOptionRepository.findByProductId(productId).stream()
                .map(ProductOptionResponseDto::from)
                .collect(Collectors.toList());
    }

    public ProductOptionResponseDto findById(Long id) {
        ProductOption productOption = productOptionRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.PRODUCT_OPTION_NOT_FOUND));
        return ProductOptionResponseDto.from(productOption);
    }

    @Transactional
    public ProductOptionResponseDto update(Long id, ProductOptionRequestDto request) {
        ProductOption productOption = productOptionRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.PRODUCT_OPTION_NOT_FOUND));
        Size size = sizeRepository.findById(request.getSizeId())
                .orElseThrow(() -> new BusinessException(ErrorCode.SIZE_NOT_FOUND));

        String skuCode = productOption.getProduct().getProductCode() + request.getColorCode() + size.getSkuCode();

        productOption.update(request.getColor(), request.getColorCode(), size, skuCode, request.getStatus());
        return ProductOptionResponseDto.from(productOption);
    }

    @Transactional
    public void delete(Long id) {
        if (!productOptionRepository.existsById(id)) {
            throw new BusinessException(ErrorCode.PRODUCT_OPTION_NOT_FOUND);
        }
        productOptionRepository.deleteById(id);
    }
}