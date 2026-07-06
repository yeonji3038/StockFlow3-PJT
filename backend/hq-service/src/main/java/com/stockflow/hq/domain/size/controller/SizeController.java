package com.stockflow.hq.domain.size.controller;

import com.stockflow.hq.domain.size.dto.SizeRequestDto;
import com.stockflow.hq.domain.size.dto.SizeResponseDto;
import com.stockflow.hq.domain.size.service.SizeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sizes")
@RequiredArgsConstructor
public class SizeController {

    private final SizeService sizeService;

    @PostMapping
    public ResponseEntity<SizeResponseDto> create(@RequestBody @Valid SizeRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sizeService.create(request));
    }

    @GetMapping
    public ResponseEntity<List<SizeResponseDto>> getAll() {
        return ResponseEntity.ok(sizeService.findAll());
    }

    @PutMapping("/{id}")
    public ResponseEntity<SizeResponseDto> update(@PathVariable Long id, @RequestBody @Valid SizeRequestDto request) {
        return ResponseEntity.ok(sizeService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        sizeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}