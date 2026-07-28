package com.shiptrackpro.service;

import com.shiptrackpro.dto.PendingUserResponse;
import java.util.List;

public interface AdminService {

    List<PendingUserResponse> getPendingUsers();

    List<PendingUserResponse> getApprovedUsers();

    List<PendingUserResponse> getRejectedUsers();

    void approveUser(Long id);

    void rejectUser(Long id);

}