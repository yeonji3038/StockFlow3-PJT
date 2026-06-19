package com.stockflow.store.domain.user.entity;

import com.stockflow.store.domain.store.entity.Store;
import com.stockflow.store.domain.warehouse.entity.Warehouse;
import com.stockflow.store.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "users")
public class User extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id")
    private Store store;

    // 창고 담당자 배정
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id")
    private Warehouse warehouse;

    public void update(String name, UserRole role, Store store, Warehouse warehouse) {
        this.name = name;
        this.role = role;
        this.store = store;
        this.warehouse = warehouse;
    }
}