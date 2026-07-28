package com.shiptrackpro.service.impl;

import com.shiptrackpro.dto.PendingUserResponse;
import com.shiptrackpro.entity.RegistrationStatus;
import com.shiptrackpro.entity.User;
import com.shiptrackpro.exception.ResourceNotFoundException;
import com.shiptrackpro.repository.UserRepository;
import com.shiptrackpro.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminServiceImpl implements AdminService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public List<PendingUserResponse> getPendingUsers() {
        List<User> pendingUsers = userRepository.findByRegistrationStatus(RegistrationStatus.PENDING);

        return pendingUsers.stream().map(user -> new PendingUserResponse(
                user.getUserId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().getRoleName(),
                user.getRegistrationStatus()
        )).collect(Collectors.toList());
    }

    @Override
    public List<PendingUserResponse> getApprovedUsers() {
        List<User> approvedUsers = userRepository.findByRegistrationStatus(RegistrationStatus.APPROVED);

        return approvedUsers.stream().map(user -> new PendingUserResponse(
                user.getUserId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().getRoleName(),
                user.getRegistrationStatus()
        )).collect(Collectors.toList());
    }

    @Override
    public List<PendingUserResponse> getRejectedUsers() {
        List<User> rejectedUsers = userRepository.findByRegistrationStatus(RegistrationStatus.REJECTED);

        return rejectedUsers.stream().map(user -> new PendingUserResponse(
                user.getUserId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().getRoleName(),
                user.getRegistrationStatus()
        )).collect(Collectors.toList());
    }

    @Override
    public void approveUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        user.setRegistrationStatus(RegistrationStatus.APPROVED);
        userRepository.save(user);
    }

    @Override
    public void rejectUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        user.setRegistrationStatus(RegistrationStatus.REJECTED);
        userRepository.save(user);
    }
}