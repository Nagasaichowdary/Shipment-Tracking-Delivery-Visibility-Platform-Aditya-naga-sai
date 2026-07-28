package com.shiptrackpro.controller;

import com.shiptrackpro.dto.PendingUserResponse;
import com.shiptrackpro.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @GetMapping("/pending-users")
    public ResponseEntity<List<PendingUserResponse>> getPendingUsers() {
        return ResponseEntity.ok(adminService.getPendingUsers());
    }
    
    @GetMapping("/approved-users")
    public ResponseEntity<List<PendingUserResponse>> getApprovedUsers() {
        return ResponseEntity.ok(adminService.getApprovedUsers());
    }

    @GetMapping("/rejected-users")
    public ResponseEntity<List<PendingUserResponse>> getRejectedUsers() {
        return ResponseEntity.ok(adminService.getRejectedUsers());
    }

    @PutMapping("/approve/{id}")
    public ResponseEntity<Map<String, String>> approveUser(@PathVariable Long id) {
        adminService.approveUser(id);
        return ResponseEntity.ok(Map.of("message", "User approved successfully."));
    }

    @PutMapping("/reject/{id}")
    public ResponseEntity<Map<String, String>> rejectUser(@PathVariable Long id) {
        adminService.rejectUser(id);
        return ResponseEntity.ok(Map.of("message", "User rejected successfully."));
    }
}