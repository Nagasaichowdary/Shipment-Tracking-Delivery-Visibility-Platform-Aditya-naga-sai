package com.shiptrackpro.service.impl;

import com.shiptrackpro.dto.RoleResponse;
import com.shiptrackpro.entity.Role;
import com.shiptrackpro.repository.RoleRepository;
import com.shiptrackpro.service.RoleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RoleServiceImpl implements RoleService {

    @Autowired
    private RoleRepository roleRepository;

    @Override
    public List<RoleResponse> getAllRoles() {

        List<Role> roles = roleRepository.findAll();

        return roles.stream()
                .map(role -> new RoleResponse(
                        role.getRoleId(),
                        role.getRoleName()
                ))
                .toList();
    }
}