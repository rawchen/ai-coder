package com.rawchen.ai.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rawchen.ai.convert.TenantAuthConvert;
import com.rawchen.ai.entity.LimitPackage;
import com.rawchen.ai.entity.TenantAuth;
import com.rawchen.ai.entity.vo.TenantAuthVo;
import com.rawchen.ai.mapper.LimitPackageMapper;
import com.rawchen.ai.mapper.TenantAuthMapper;
import com.rawchen.ai.service.TenantAuthService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * @author RawChen
 * @date 2023-11-28 17:59
 */
@Slf4j
@Service
public class TenantAuthServiceImpl implements TenantAuthService {

    @Autowired
    TenantAuthMapper tenantAuthMapper;

    @Autowired
    LimitPackageMapper limitPackageMapper;

    /**
     * 租户KEY判断租户能用的行数
     *
     * @return
     */
    public Long rowNumberLimit(String tenantKey) {

        List<LimitPackage> tenantAuths = limitPackageMapper.selectList(null);
        Map<Long, Long> map = tenantAuths.stream().collect(Collectors.toMap(LimitPackage::getId, LimitPackage::getRowLimit, (key1, key2) -> key2));

        log.info("rowNumberLimit tenantKey: {}", tenantKey);
        TenantAuth tenantAuth = tenantAuthMapper.selectOne(new LambdaQueryWrapper<TenantAuth>().eq(TenantAuth::getTenantKey, tenantKey).last("limit 1"));
        if (tenantAuth == null) {
            // 通过租户获取tenant_auth，如果空的就说明该租户没用过插件，新建实体，设置套餐id为试用1
            TenantAuth tenantAuthNew = new TenantAuth().setTenantKey(tenantKey).setAuthorizationId(1L).setCreatedAt(LocalDateTime.now()).setUpdatedAt(LocalDateTime.now());
            tenantAuthMapper.insert(tenantAuthNew);
            return map.get(1L);
        } else if (tenantAuth.getAuthorizationId() == 1) {
            // 不为空，如果是1，判断天数超过限制了没，超过了就修改为普通用户设置行数为150
            TenantAuthVo vo = TenantAuthConvert.INSTANCE.tenantAuthToTenantAuthVo(tenantAuth);
            if (vo.getRemainDays() < 0) {
                tenantAuthMapper.updateById(new TenantAuth().setId(tenantAuth.getId()).setAuthorizationId(2L));
                return map.get(2L);
            } else {
                // 试用但是时间还没到，返回高级用户行数
                return map.get(1L);
            }
        } else if (tenantAuth.getAuthorizationId() == 2) {
            return map.get(2L);
        } else if (tenantAuth.getAuthorizationId() == 3) {
            return map.get(3L);
        }

        // 不为空，如果是2，判断天数超过限制了没，超过了就设置为2
        return 0L;
    }
}
