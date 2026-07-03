package com.stockflow.hq.domain.category.entity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "categories")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "code", nullable = false, unique = true)
    private String code; // SKU 조합용 카테고리 코드: TS, PT, OT 등

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Category parent;

    public void update(String name, String code, Category parent) {
        this.name = name;
        this.code = code;
        this.parent = parent;
    }
}