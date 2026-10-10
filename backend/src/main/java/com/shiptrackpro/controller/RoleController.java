package com.shiptrackpro.controller;

import com.shiptrackpro.dto.RoleResponse;
import com.shiptrackpro.service.RoleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
public class RoleController {

    @Autowired
    private RoleService roleService;

    @GetMapping
    public List<RoleResponse> getAllRoles() {
        return roleService.getAllRoles();
    }
}