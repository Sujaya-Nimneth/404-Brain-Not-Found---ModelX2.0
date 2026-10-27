package com.modelx.atie.domain;

import java.math.BigDecimal;

public record Origin(
        String code,
        String name,
        String district,
        String province,
        BigDecimal latitude,
        BigDecimal longitude,
        String supplyZone
) {
}
