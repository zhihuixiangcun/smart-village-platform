/**
 * 村委端审批卡片组件
 * 处理财务交易、预算、数据采集等审批任务
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  TextInput,
  Dimensions,
  Animated
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Chip, Button, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

import colors from '../../utils/colors';
import typography from '../../utils/typography';
import { approvalApi } from '../../api/approval';
import { notificationApi } from '../../api/notification';
import { useAuth } from '../../hooks/useAuth';

const { width: screenWidth } = Dimensions.get('window');

const ApprovalCard = ({
  approvalItem,
  onApprove,
  onReject,
  onDetail,
  style
}) => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const slideAnim = new Animated.Value(0);

  useEffect(() => {
    if (expanded) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }).start();
    }
  }, [expanded]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'approved':
        return colors.success;
      case 'rejected':
        return colors.error;
      case 'completed':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return '待审批';
      case 'approved':
        return '已通过';
      case 'rejected':
        return '已拒绝';
      case 'completed':
        return '已完成';
      default:
        return '未知';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'financial_transaction':
        return 'account-balance-wallet';
      case 'budget_approval':
        return 'assessment';
      case 'data_collection':
        return 'data-usage';
      case 'emergency_response':
        return 'emergency';
      default:
        return 'description';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'financial_transaction':
        return colors.success;
      case 'budget_approval':
        return colors.primary;
      case 'data_collection':
        return colors.info;
      case 'emergency_response':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const handleApprove = async () => {
    try {
      setProcessing(true);

      const response = await approvalApi.approveItem(approvalItem.id, {
        approverId: user._id,
        approverName: user.name,
        comments: '审批通过'
      });

      if (response.success) {
        // 发送通知
        await notificationApi.sendNotification({
          type: 'approval_approved',
          recipientId: approvalItem.submitterId,
          title: '审批通过',
          message: `您的${approvalItem.title}申请已通过审批`,
          data: {
            approvalId: approvalItem.id,
            type: approvalItem.type
          }
        });

        Alert.alert('成功', '审批已通过', [{ text: '确定' }]);
        onApprove?.(approvalItem.id);
      }
    } catch (error) {
      console.error('审批失败:', error);
      Alert.alert('错误', '审批操作失败，请重试');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('提示', '请填写拒绝原因');
      return;
    }

    try {
      setProcessing(true);

      const response = await approvalApi.rejectItem(approvalItem.id, {
        approverId: user._id,
        approverName: user.name,
        reason: rejectReason
      });

      if (response.success) {
        // 发送通知
        await notificationApi.sendNotification({
          type: 'approval_rejected',
          recipientId: approvalItem.submitterId,
          title: '审批拒绝',
          message: `您的${approvalItem.title}申请被拒绝：${rejectReason}`,
          data: {
            approvalId: approvalItem.id,
            type: approvalItem.type,
            reason: rejectReason
          }
        });

        Alert.alert('成功', '审批已拒绝', [{ text: '确定' }]);
        onReject?.(approvalItem.id);
        setShowRejectModal(false);
        setRejectReason('');
      }
    } catch (error) {
      console.error('拒绝失败:', error);
      Alert.alert('错误', '拒绝操作失败，请重试');
    } finally {
      setProcessing(false);
    }
  };

  const formatAmount = (amount) => {
    if (!amount) return '0';
    return new Intl.NumberFormat('zh-CN').format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={[
          styles.typeIcon,
          { backgroundColor: getTypeColor(approvalItem.type) }
        ]}>
          <Icon
            name={getTypeIcon(approvalItem.type)}
            size={20}
            color="#fff"
          />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.title} numberOfLines={2}>
            {approvalItem.title}
          </Text>
          <Text style={styles.submitter}>
            提交人：{approvalItem.submitterName}
          </Text>
        </View>
      </View>

      <View style={styles.headerRight}>
        <Chip
          style={[styles.statusChip, { backgroundColor: getStatusColor(approvalItem.status) }]}
          textStyle={styles.statusChipText}
        >
          {getStatusText(approvalItem.status)}
        </Chip>

        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Icon
            name={expanded ? 'expand-less' : 'expand-more'}
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPriority = () => {
    if (approvalItem.priority === 'normal') return null;

    const priorityConfig = {
      high: { color: colors.error, text: '高', icon: 'priority-high' },
      urgent: { color: colors.error, text: '紧急', icon: 'warning' }
    };

    const config = priorityConfig[approvalItem.priority] || priorityConfig.high;

    return (
      <View style={styles.priorityContainer}>
        <Icon name={config.icon} size={16} color={config.color} />
        <Text style={[styles.priorityText, { color: config.color }]}>
          {config.text}优先级
        </Text>
      </View>
    );
  };

  const renderBasicInfo = () => (
    <View style={styles.basicInfo}>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>申请时间</Text>
        <Text style={styles.infoValue}>
          {formatDate(approvalItem.submittedAt)}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>类型</Text>
        <Text style={styles.infoValue}>
          {approvalItem.typeDescription || approvalItem.type}
        </Text>
      </View>

      {approvalItem.amount && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>金额</Text>
          <Text style={styles.amountValue}>
            ¥{formatAmount(approvalItem.amount)}
          </Text>
        </View>
      )}

      {approvalItem.deadline && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>截止时间</Text>
          <Text style={[
            styles.infoValue,
            new Date() > new Date(approvalItem.deadline) && styles.overdueValue
          ]}>
            {formatDate(approvalItem.deadline)}
          </Text>
        </View>
      )}
    </View>
  );

  const renderDescription = () => {
    if (!approvalItem.description) return null;

    return (
      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionLabel}>申请说明</Text>
        <Text style={styles.descriptionText} numberOfLines={expanded ? undefined : 3}>
          {approvalItem.description}
        </Text>
        {!expanded && approvalItem.description.length > 100 && (
          <TouchableOpacity
            style={styles.expandDescriptionButton}
            onPress={() => setExpanded(true)}
          >
            <Text style={styles.expandDescriptionText}>查看更多</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderDetails = () => {
    if (!expanded) return null;

    return (
      <Animated.View style={[styles.detailsContainer, { opacity: slideAnim }]}>
        {approvalItem.attachments && approvalItem.attachments.length > 0 && (
          <View style={styles.attachmentsContainer}>
            <Text style={styles.attachmentsLabel}>附件</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {approvalItem.attachments.map((attachment, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.attachmentItem}
                  onPress={() => handleAttachmentPress(attachment)}
                >
                  <Icon
                    name={attachment.type === 'image' ? 'image' : 'description'}
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {attachment.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {approvalItem.workflow && (
          <View style={styles.workflowContainer}>
            <Text style={styles.workflowLabel}>审批流程</Text>
            {approvalItem.workflow.map((step, index) => (
              <View key={index} style={styles.workflowStep}>
                <View style={styles.workflowStepHeader}>
                  <View
                    style={[
                      styles.workflowStepIcon,
                      {
                        backgroundColor: step.completed
                          ? colors.success
                          : step.current
                          ? colors.primary
                          : colors.border
                      }
                    ]}
                  >
                    <Icon
                      name={step.completed ? 'check' : step.current ? 'clock' : 'radio-button-unchecked'}
                      size={16}
                      color="#fff"
                    />
                  </View>
                  <Text style={styles.workflowStepTitle}>{step.title}</Text>
                  <Text style={styles.workflowStepDate}>
                    {step.completedAt || (step.current ? '当前' : '')}
                  </Text>
                </View>
                {step.approver && (
                  <Text style={styles.workflowApprover}>
                    审批人：{step.approver}
                  </Text>
                )}
                {step.comments && (
                  <Text style={styles.workflowComments}>
                    备注：{step.comments}
                  </Text>
                )}
                {index < approvalItem.workflow.length - 1 && (
                  <View style={styles.workflowConnector} />
                )}
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    );
  };

  const renderActions = () => {
    if (approvalItem.status !== 'pending') {
      return (
        <View style={styles.completedActions}>
          <Button
            mode="outlined"
            onPress={() => onDetail?.(approvalItem.id)}
            style={styles.detailButton}
          >
            查看详情
          </Button>
        </View>
      );
    }

    return (
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => setShowRejectModal(true)}
          disabled={processing}
        >
          <Icon name="close" size={20} color={colors.error} />
          <Text style={[styles.actionButtonText, { color: colors.error }]}>
            拒绝
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={handleApprove}
          disabled={processing}
        >
          {processing ? (
            <Icon name="hourglass-empty" size={20} color="#fff" />
          ) : (
            <Icon name="check" size={20} color="#fff" />
          )}
          <Text style={styles.actionButtonText}>
            {processing ? '处理中...' : '通过'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleAttachmentPress = (attachment) => {
    navigation.navigate('AttachmentViewer', {
      attachment,
      title: approvalItem.title
    });
  };

  return (
    <View style={[styles.container, style]}>
      {renderHeader()}

      <TouchableOpacity
        style={styles.content}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        {renderPriority()}
        {renderBasicInfo()}
        {renderDescription()}
      </TouchableOpacity>

      {renderDetails()}
      <Divider style={styles.divider} />
      {renderActions()}

      {/* 拒绝原因弹窗 */}
      <Modal
        visible={showRejectModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>拒绝原因</Text>
            <TouchableOpacity onPress={() => setShowRejectModal(false)}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.rejectInput}
            placeholder="请输入拒绝原因..."
            value={rejectReason}
            onChangeText={setRejectReason}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setShowRejectModal(false)}
              style={styles.modalCancelButton}
            >
              取消
            </Button>
            <Button
              mode="contained"
              onPress={handleReject}
              disabled={!rejectReason.trim() || processing}
              style={styles.modalConfirmButton}
            >
              确认拒绝
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  submitter: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
  statusChip: {
    height: 24,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '500',
  },
  expandButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  basicInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  infoValue: {
    ...typography.caption,
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  amountValue: {
    ...typography.caption,
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  overdueValue: {
    color: colors.error,
  },
  descriptionContainer: {
    marginBottom: 12,
  },
  descriptionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  descriptionText: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  expandDescriptionButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  expandDescriptionText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 12,
  },
  detailsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  attachmentsContainer: {
    marginBottom: 16,
  },
  attachmentsLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  attachmentItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 60,
  },
  attachmentName: {
    ...typography.caption,
    color: colors.text,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  workflowContainer: {
    marginBottom: 16,
  },
  workflowLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  workflowStep: {
    position: 'relative',
    marginBottom: 16,
  },
  workflowStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  workflowStepIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workflowStepTitle: {
    ...typography.caption,
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  workflowStepDate: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },
  workflowApprover: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    marginLeft: 36,
    marginBottom: 2,
  },
  workflowComments: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    marginLeft: 36,
  },
  workflowConnector: {
    position: 'absolute',
    left: 11,
    top: 24,
    height: 16,
    width: 2,
    backgroundColor: colors.border,
  },
  divider: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  completedActions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.error,
  },
  actionButtonText: {
    ...typography.button,
    fontSize: 14,
    fontWeight: '500',
  },
  detailButton: {
    borderColor: colors.primary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  rejectInput: {
    margin: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    height: 120,
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: colors.error,
  },
});

export default ApprovalCard;