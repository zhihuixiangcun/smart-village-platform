/**
 * Emergency Call Socket.IO Event Handlers
 *
 * Handles real-time emergency call events including:
 * - Call initiation and status updates
 * - Location sharing
 * - Bidirectional communication
 * - Room management by village/group
 */

const emergencyCallService = require('../services/emergencyCallService');
const logger = require('../utils/logger');

/**
 * Setup emergency call event handlers
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Object} io - Socket.IO server instance
 */
function setupEmergencyHandlers(socket, io) {
  const userId = socket.userId;
  const userVillageId = socket.villageId;

  /**
   * Join village emergency room
   */
  socket.on('emergency:join-village', (data) => {
    const { villageId } = data;

    if (!villageId) {
      socket.emit('error', { message: 'Village ID is required' });
      return;
    }

    // Join village-specific room
    socket.join(`village:${villageId}`);
    socket.join(`village:${villageId}:emergency`);

    logger.info(`User ${userId} joined village ${villageId} emergency room`);

    socket.emit('emergency:joined', {
      villageId,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Leave village emergency room
   */
  socket.on('emergency:leave-village', (data) => {
    const { villageId } = data;

    if (!villageId) {
      socket.emit('error', { message: 'Village ID is required' });
      return;
    }

    socket.leave(`village:${villageId}`);
    socket.leave(`village:${villageId}:emergency`);

    logger.info(`User ${userId} left village ${villageId} emergency room`);

    socket.emit('emergency:left', {
      villageId,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Initiate emergency call
   */
  socket.on('emergency:call', async (data) => {
    try {
      const {
        villageId,
        emergencyType,
        location,
        description,
        attachments,
        priority
      } = data;

      // Validate required fields
      if (!villageId || !emergencyType || !location) {
        socket.emit('error', {
          message: 'Missing required fields',
          required: ['villageId', 'emergencyType', 'location']
        });
        return;
      }

      // Create emergency call
      const result = await emergencyCallService.handleEmergencyCall({
        villageId,
        callerId: userId,
        location,
        emergencyType,
        description,
        attachments,
        priority
      });

      // Emit success response to caller
      socket.emit('emergency:call:created', {
        callId: result.callId,
        status: 'created',
        notifiedPersonnel: result.notifiedPersonnel,
        estimatedResponseTime: result.estimatedResponseTime,
        timestamp: new Date().toISOString()
      });

      // Broadcast to village emergency room
      io.to(`village:${villageId}:emergency`).emit('emergency:broadcast', {
        callId: result.callId,
        type: emergencyType,
        location,
        description,
        priority,
        callerId: userId,
        timestamp: new Date().toISOString()
      });

      logger.info(`Emergency call ${result.callId} created by user ${userId}`);

    } catch (error) {
      logger.error('Error creating emergency call:', error);

      socket.emit('emergency:call:failed', {
        message: error.message || 'Failed to create emergency call',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Respond to emergency call
   */
  socket.on('emergency:respond', async (data) => {
    try {
      const { callId, message, location, eta } = data;

      if (!callId) {
        socket.emit('error', { message: 'Call ID is required' });
        return;
      }

      // Update call status
      const updated = await emergencyCallService.updateCallStatus(
        callId,
        'responded',
        userId
      );

      if (!updated) {
        socket.emit('emergency:respond:failed', {
          message: 'Failed to respond to call',
          callId
        });
        return;
      }

      // Get call details
      const call = await emergencyCallService.getCachedCallStatus(callId);

      // Emit response to caller
      socket.emit('emergency:respond:success', {
        callId,
        responderId: userId,
        timestamp: new Date().toISOString()
      });

      // Broadcast response to village room
      if (call && call.villageId) {
        io.to(`village:${call.villageId}:emergency`).emit('emergency:responded', {
          callId,
          responderId: userId,
          message,
          location,
          eta,
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`User ${userId} responded to emergency call ${callId}`);

    } catch (error) {
      logger.error('Error responding to emergency call:', error);

      socket.emit('emergency:respond:failed', {
        message: error.message || 'Failed to respond to call',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Update location during emergency call
   */
  socket.on('emergency:location:update', async (data) => {
    try {
      const { callId, location } = data;

      if (!callId || !location) {
        socket.emit('error', { message: 'Call ID and location are required' });
        return;
      }

      // Update call location in service
      await emergencyCallService.updateCallLocation(callId, {
        ...location,
        userId,
        timestamp: Date.now()
      });

      // Acknowledge update
      socket.emit('emergency:location:updated', {
        callId,
        timestamp: new Date().toISOString()
      });

      // Broadcast location update to relevant parties
      const call = await emergencyCallService.getCachedCallStatus(callId);
      if (call) {
        // Send to caller
        io.to(`user:${call.callerId}`).emit('emergency:location:update', {
          callId,
          location,
          userId,
          timestamp: new Date().toISOString()
        });

        // Send to village emergency room
        if (call.villageId) {
          io.to(`village:${call.villageId}:emergency`).emit('emergency:location:broadcast', {
            callId,
            location,
            userId,
            timestamp: new Date().toISOString()
          });
        }
      }

    } catch (error) {
      logger.error('Error updating emergency location:', error);

      socket.emit('error', {
        message: 'Failed to update location',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Send chat message during emergency call
   */
  socket.on('emergency:chat:send', async (data) => {
    try {
      const { callId, message, type = 'text' } = data;

      if (!callId || !message) {
        socket.emit('error', { message: 'Call ID and message are required' });
        return;
      }

      const chatMessage = {
        id: Date.now().toString(),
        callId,
        userId,
        message,
        type,
        timestamp: new Date().toISOString()
      };

      // Get call details to determine rooms
      const call = await emergencyCallService.getCachedCallStatus(callId);

      // Broadcast message to relevant parties
      if (call && call.villageId) {
        io.to(`village:${call.villageId}:emergency`).emit('emergency:chat:message', chatMessage);

        // Also send to specific users involved in the call
        if (call.callerId) {
          io.to(`user:${call.callerId}`).emit('emergency:chat:message', chatMessage);
        }
        if (call.responderId) {
          io.to(`user:${call.responderId}`).emit('emergency:chat:message', chatMessage);
        }
      }

      // Acknowledge message sent
      socket.emit('emergency:chat:sent', {
        messageId: chatMessage.id,
        timestamp: chatMessage.timestamp
      });

      logger.info(`Chat message sent for call ${callId} by user ${userId}`);

    } catch (error) {
      logger.error('Error sending emergency chat:', error);

      socket.emit('error', {
        message: 'Failed to send message',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Cancel emergency call
   */
  socket.on('emergency:cancel', async (data) => {
    try {
      const { callId, reason } = data;

      if (!callId) {
        socket.emit('error', { message: 'Call ID is required' });
        return;
      }

      // Only allow caller or admin to cancel
      const call = await emergencyCallService.getCachedCallStatus(callId);
      if (!call) {
        socket.emit('emergency:cancel:failed', {
          message: 'Call not found',
          callId
        });
        return;
      }

      if (call.callerId !== userId && socket.userRole !== 'admin') {
        socket.emit('emergency:cancel:failed', {
          message: 'Not authorized to cancel this call',
          callId
        });
        return;
      }

      // Cancel the call
      const cancelled = await emergencyCallService.handleCallCancellation(callId, reason);

      if (!cancelled) {
        socket.emit('emergency:cancel:failed', {
          message: 'Failed to cancel call',
          callId
        });
        return;
      }

      // Notify caller
      socket.emit('emergency:cancel:success', {
        callId,
        reason,
        timestamp: new Date().toISOString()
      });

      // Broadcast cancellation to village room
      if (call.villageId) {
        io.to(`village:${call.villageId}:emergency`).emit('emergency:cancelled', {
          callId,
          cancelledBy: userId,
          reason,
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Emergency call ${callId} cancelled by user ${userId}`);

    } catch (error) {
      logger.error('Error cancelling emergency call:', error);

      socket.emit('emergency:cancel:failed', {
        message: error.message || 'Failed to cancel call',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Resolve emergency call
   */
  socket.on('emergency:resolve', async (data) => {
    try {
      const { callId, result, notes } = data;

      if (!callId) {
        socket.emit('error', { message: 'Call ID is required' });
        return;
      }

      // Update call status to resolved
      const updated = await emergencyCallService.updateCallStatus(callId, 'resolved', userId);

      if (!updated) {
        socket.emit('emergency:resolve:failed', {
          message: 'Failed to resolve call',
          callId
        });
        return;
      }

      // Get call details
      const call = await emergencyCallService.getCachedCallStatus(callId);

      // Notify resolver
      socket.emit('emergency:resolve:success', {
        callId,
        result,
        notes,
        timestamp: new Date().toISOString()
      });

      // Broadcast resolution to village room
      if (call && call.villageId) {
        io.to(`village:${call.villageId}:emergency`).emit('emergency:resolved', {
          callId,
          resolvedBy: userId,
          result,
          notes,
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Emergency call ${callId} resolved by user ${userId}`);

    } catch (error) {
      logger.error('Error resolving emergency call:', error);

      socket.emit('emergency:resolve:failed', {
        message: error.message || 'Failed to resolve call',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Request call status
   */
  socket.on('emergency:status:request', async (data) => {
    try {
      const { callId } = data;

      if (!callId) {
        socket.emit('error', { message: 'Call ID is required' });
        return;
      }

      // Get call status
      const call = await emergencyCallService.getCachedCallStatus(callId);

      if (!call) {
        socket.emit('emergency:status:notfound', {
          message: 'Call not found',
          callId
        });
        return;
      }

      // Send status to requester
      socket.emit('emergency:status:response', {
        callId,
        status: call.status,
        ...call,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error getting call status:', error);

      socket.emit('error', {
        message: 'Failed to get call status',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Subscribe to call updates
   */
  socket.on('emergency:subscribe', (data) => {
    const { callId } = data;

    if (!callId) {
      socket.emit('error', { message: 'Call ID is required' });
      return;
    }

    // Join call-specific room
    socket.join(`call:${callId}`);

    socket.emit('emergency:subscribed', {
      callId,
      timestamp: new Date().toISOString()
    });

    logger.info(`User ${userId} subscribed to call ${callId} updates`);
  });

  /**
   * Unsubscribe from call updates
   */
  socket.on('emergency:unsubscribe', (data) => {
    const { callId } = data;

    if (!callId) {
      socket.emit('error', { message: 'Call ID is required' });
      return;
    }

    // Leave call-specific room
    socket.leave(`call:${callId}`);

    socket.emit('emergency:unsubscribed', {
      callId,
      timestamp: new Date().toISOString()
    });

    logger.info(`User ${userId} unsubscribed from call ${callId} updates`);
  });

  /**
   * Broadcast emergency alert to village
   */
  socket.on('emergency:broadcast', async (data) => {
    try {
      const { villageId, type, message, severity = 'high' } = data;

      if (!villageId || !type || !message) {
        socket.emit('error', {
          message: 'Missing required fields',
          required: ['villageId', 'type', 'message']
        });
        return;
      }

      // Validate user has permission to broadcast
      if (socket.userRole !== 'admin' && socket.userRole !== 'committee') {
        socket.emit('error', {
          message: 'Not authorized to broadcast emergency alerts'
        });
        return;
      }

      const alert = {
        id: Date.now().toString(),
        villageId,
        type,
        message,
        severity,
        broadcastBy: userId,
        timestamp: new Date().toISOString()
      };

      // Broadcast to village emergency room
      io.to(`village:${villageId}:emergency`).emit('emergency:alert:broadcast', alert);

      // Also broadcast to general village room
      io.to(`village:${villageId}`).emit('emergency:alert', alert);

      // Acknowledge broadcast
      socket.emit('emergency:broadcast:sent', {
        alertId: alert.id,
        timestamp: alert.timestamp
      });

      logger.info(`Emergency alert broadcast to village ${villageId} by user ${userId}`);

    } catch (error) {
      logger.error('Error broadcasting emergency alert:', error);

      socket.emit('error', {
        message: 'Failed to broadcast alert',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Handle user going online/offline
   */
  socket.on('emergency:presence:update', (data) => {
    const { status, location } = data;

    // Update user presence in their village room
    if (userVillageId) {
      io.to(`village:${userVillageId}:emergency`).emit('emergency:presence:changed', {
        userId,
        status,
        location,
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`User ${userId} presence updated: ${status}`);
  });

  /**
   * Handle disconnection
   */
  socket.on('disconnecting', () => {
    // Log which rooms the socket is leaving
    const rooms = socket.rooms;
    logger.info(`User ${userId} disconnecting from rooms:`, Array.from(rooms));
  });

  socket.on('disconnect', () => {
    // Update user presence to offline
    if (userVillageId) {
      io.to(`village:${userVillageId}:emergency`).emit('emergency:presence:changed', {
        userId,
        status: 'offline',
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`User ${userId} disconnected from emergency handlers`);
  });
}

/**
 * Setup emergency namespace (optional, for separate emergency namespace)
 * @param {Object} io - Socket.IO server instance
 */
function setupEmergencyNamespace(io) {
  const emergencyNamespace = io.of('/emergency');

  emergencyNamespace.use((socket, next) => {
    // Authentication middleware for emergency namespace
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    // Verify token and attach user info
    // This would integrate with your auth system
    socket.userId = socket.handshake.auth.userId;
    socket.villageId = socket.handshake.auth.villageId;
    socket.userRole = socket.handshake.auth.role;

    next();
  });

  emergencyNamespace.on('connection', (socket) => {
    logger.info(`Emergency namespace connected: ${socket.id}`);

    setupEmergencyHandlers(socket, emergencyNamespace);
  });

  return emergencyNamespace;
}

module.exports = {
  setupEmergencyHandlers,
  setupEmergencyNamespace
};