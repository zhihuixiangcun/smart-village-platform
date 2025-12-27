import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  Modal,
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  PermissionsAndroid,
  AppState
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
import { launchImageLibrary } from 'react-native-image-picker';
import { emergencyApi } from '../api/emergency';
import { useAuth } from '../hooks/useAuth';
import colors from '../utils/colors';
import typography from '../utils/typography';

const { width, height } = Dimensions.get('window');

const EmergencyCall = ({ visible, onClose }) => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [calling, setCalling] = useState(false);
  const [active, setActive] = useState(false);
  const [callResult, setCallResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [description, setDescription] = useState('');
  const [casualties, setCasualties] = useState(0);
  const [vulnerableGroups, setVulnerableGroups] = useState([]);
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [relationship, setRelationship] = useState('self');
  const [victimName, setVictimName] = useState('');
  const [victimAge, setVictimAge] = useState('');
  const [victimGender, setVictimGender] = useState('male');
  const [victimCondition, setVictimCondition] = useState('');
  const [address, setAddress] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);

  const scrollViewRef = useRef(null);

  // 紧急类型配置
  const emergencyTypes = [
    {
      name: '医疗急救',
      value: 'medical',
      icon: 'local-hospital',
      color: '#f56c6c',
      description: '需要医疗救助'
    },
    {
      name: '火灾',
      value: 'fire',
      icon: 'local-fire-department',
      color: '#ff6b6b',
      description: '火灾紧急情况'
    },
    {
      name: '事故',
      value: 'accident',
      icon: 'car-crash',
      color: '#ffa940',
      description: '交通事故'
    },
    {
      name: '人员失踪',
      value: 'missing_person',
      icon: 'person-search',
      color: '#722ed1',
      description: '寻找失踪人员'
    },
    {
      name: '公共安全',
      value: 'public_security',
      icon: 'security',
      color: '#13c2c2',
      description: '治安紧急情况'
    },
    {
      name: '自然灾害',
      value: 'natural_disaster',
      icon: 'warning',
      color: '#52c41a',
      description: '自然灾害'
    }
  ];

  // 紧急程度配置
  const urgencyLevels = [
    { label: '一般', value: 'low', color: '#52c41a' },
    { label: '紧急', value: 'medium', color: '#fa8c16' },
    { label: '非常紧急', value: 'high', color: '#f5222d' }
  ];

  // 特殊人群选项
  const vulnerableOptions = [
    { label: '老人', value: 'elderly', icon: 'elderly' },
    { label: '儿童', value: 'children', icon: 'child-care' },
    { label: '残疾人', value: 'disabled', icon: 'accessible' },
    { label: '孕妇', value: 'pregnant', icon: 'pregnant-woman' }
  ];

  // 关系选项
  const relationshipOptions = [
    { label: '本人', value: 'self' },
    { label: '家人', value: 'family' },
    { label: '朋友', value: 'friend' },
    { label: '邻居', value: 'neighbor' },
    { label: '路人', value: 'passerby' },
    { label: '其他', value: 'other' }
  ];

  // 初始化
  useEffect(() => {
    if (visible && user) {
      // 自动填充用户信息
      setReporterName(user.displayName || '');
      setReporterPhone(user.phone || '');
      setRelationship('self');
    }
  }, [visible, user]);

  // 获取当前位置
  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      // 检查权限
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('权限不足', '请授予位置权限以获取您的当前位置');
          return;
        }
      }

      // 获取位置
      const position = await new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (position) => resolve(position),
          (error) => reject(error),
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000
          }
        );
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      setCurrentLocation(location);

      // 这里可以调用地理编码服务获取地址
      const mockAddress = '获取中...';
      setAddress(mockAddress);

      Alert.alert('定位成功', `已获取当前位置: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);

    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('定位失败', '无法获取当前位置，请检查定位权限');
    } finally {
      setLocationLoading(false);
    }
  };

  // 选择图片/视频
  const selectMedia = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.8,
        selectionLimit: 5
      });

      if (result.assets) {
        const newMedia = result.assets.map(asset => ({
          uri: asset.uri,
          type: asset.type.includes('image') ? 'image' : 'video',
          name: asset.fileName,
          size: asset.fileSize
        }));

        setMediaFiles([...mediaFiles, ...newMedia]);
      }
    } catch (error) {
      console.error('Media selection error:', error);
      Alert.alert('选择失败', '无法选择媒体文件');
    }
  };

  // 移除媒体文件
  const removeMedia = (index) => {
    const newFiles = mediaFiles.filter((_, i) => i !== index);
    setMediaFiles(newFiles);
  };

  // 快速选择类型
  const handleQuickCall = (type) => {
    setSelectedType(type);
    // 根据类型自动设置紧急程度
    if (type === 'medical' || type === 'fire') {
      setUrgency('high');
    }
    setActive(true);
  };

  // 发起应急呼叫
  const handleEmergencyCall = async () => {
    try {
      // 验证必填字段
      if (!selectedType) {
        Alert.alert('请选择事件类型');
        return;
      }

      if (!description.trim()) {
        Alert.alert('请描述事件情况');
        return;
      }

      if (!reporterName.trim()) {
        Alert.alert('请输入报警人姓名');
        return;
      }

      if (!reporterPhone.trim()) {
        Alert.alert('请输入联系电话');
        return;
      }

      if (!address.trim() && !currentLocation) {
        Alert.alert('请提供事发位置或获取当前位置');
        return;
      }

      setCalling(true);
      setActive(true);
      Vibration.vibrate([100, 50, 100]);

      // 构建提交数据
      const emergencyData = {
        type: selectedType,
        urgency,
        description: description.trim(),
        casualties: parseInt(casualties) || 0,
        vulnerableGroups,
        reporterName: reporterName.trim(),
        reporterPhone: reporterPhone.trim(),
        relationship,
        victimName: victimName.trim(),
        victimAge: victimAge ? parseInt(victimAge) : null,
        victimGender,
        victimCondition: victimCondition.trim(),
        address: address.trim(),
        coordinates: currentLocation,
        media: mediaFiles
      };

      // 发起呼叫
      const response = await emergencyApi.oneClickCall(emergencyData);

      setCallResult(response.data);
      setShowResult(true);

      // 震动反馈
      Vibration.vibrate([200, 100, 200]);

    } catch (error) {
      console.error('Emergency call error:', error);
      Alert.alert('呼叫失败', error.message || '网络连接失败，请重试');
    } finally {
      setCalling(false);
      setActive(false);
    }
  };

  // 重置表单
  const resetForm = () => {
    setSelectedType('');
    setUrgency('medium');
    setDescription('');
    setCasualties(0);
    setVulnerableGroups([]);
    setReporterName('');
    setReporterPhone('');
    setRelationship('self');
    setVictimName('');
    setVictimAge('');
    setVictimGender('male');
    setVictimCondition('');
    setAddress('');
    setCurrentLocation(null);
    setMediaFiles([]);
    setCallResult(null);
    setShowResult(false);
    setActive(false);
  };

  // 关闭弹窗
  const handleClose = () => {
    if (calling) {
      Alert.alert(
        '呼叫进行中',
        '应急呼叫正在进行中，确定要取消吗？',
        [
          { text: '继续呼叫', style: 'cancel' },
          {
            text: '确定取消',
            style: 'destructive',
            onPress: () => {
              setCalling(false);
              setActive(false);
              onClose();
            }
          }
        ]
      );
    } else {
      resetForm();
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* 顶部操作栏 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Icon name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>应急呼叫</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}>
          {!selectedType ? (
            // 快速选择界面
            <View style={styles.quickSelectContainer}>
              <View style={styles.sectionHeader}>
                <Icon name="warning" size={32} color={colors.error} />
                <View style={styles.headerTextContainer}>
                  <Text style={styles.sectionTitle}>紧急情况？</Text>
                  <Text style={styles.sectionSubtitle}>选择事件类型，快速发起应急呼叫</Text>
                </View>
              </View>

              <View style={typesContainer}>
                {emergencyTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeCard,
                      { borderLeftColor: type.color }
                    ]}
                    onPress={() => handleQuickCall(type.value)}
                    activeOpacity={0.8}>
                    <View style={[styles.typeIconContainer, { backgroundColor: type.color }]}>
                      <Icon name={type.icon} size={28} color={colors.white} />
                    </View>
                    <Text style={styles.typeName}>{type.name}</Text>
                    <Text style={styles.typeDescription}>{type.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            // 详细信息填写界面
            <View style={styles.formContainer}>
              {/* 返回按钮 */}
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => {
                  setSelectedType('');
                  setActive(false);
                }}>
                <Icon name="arrow-back" size={24} color={colors.primary} />
                <Text style={styles.backBtnText}>重新选择类型</Text>
              </TouchableOpacity>

              {/* 当前选择的事件类型 */}
              <View style={styles.selectedTypeContainer}>
                <Text style={styles.selectedTypeLabel}>当前选择:</Text>
                <View style={styles.selectedType}>
                  <Text style={styles.selectedTypeText}>
                    {emergencyTypes.find(t => t.value === selectedType)?.name}
                  </Text>
                  <Icon name="check-circle" size={20} color={colors.success} />
                </View>
              </View>

              {/* 紧急程度 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>紧急程度</Text>
                <View style={styles.urgencyContainer}>
                  {urgencyLevels.map((level) => (
                    <TouchableOpacity
                      key={level.value}
                      style={[
                        styles.urgencyBtn,
                        urgency === level.value && {
                          backgroundColor: level.color,
                          borderColor: level.color
                        }
                      ]}
                      onPress={() => setUrgency(level.value)}>
                      <Text
                        style={[
                          styles.urgencyText,
                          urgency === level.value && { color: colors.white }
                        ]}>
                        {level.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 事件描述 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>事件描述 *</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={4}
                  placeholder="请详细描述发生的事件..."
                  value={description}
                  onChangeText={setDescription}
                  textAlignVertical="top"
                />
              </View>

              {/* 伤亡情况 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>伤亡情况</Text>
                <TextInput
                  style={styles.input}
                  placeholder="伤亡人数（如无伤亡请填写0）"
                  value={casualties.toString()}
                  onChangeText={(text) => setCasualties(parseInt(text) || 0)}
                  keyboardType="numeric"
                />
              </View>

              {/* 特殊人群 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>是否涉及特殊人群</Text>
                <View style={styles.vulnerableContainer}>
                  {vulnerableOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.vulnerableBtn,
                        vulnerableGroups.includes(option.value) && styles.vulnerableBtnSelected
                      ]}
                      onPress={() => {
                        if (vulnerableGroups.includes(option.value)) {
                          setVulnerableGroups(vulnerableGroups.filter(g => g !== option.value));
                        } else {
                          setVulnerableGroups([...vulnerableGroups, option.value]);
                        }
                      }}>
                      <Icon
                        name={option.icon}
                        size={20}
                        color={vulnerableGroups.includes(option.value) ? colors.white : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.vulnerableText,
                          vulnerableGroups.includes(option.value) && { color: colors.white }
                        ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 报警人信息 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>报警人信息</Text>
                <TextInput
                  style={styles.input}
                  placeholder="姓名 *"
                  value={reporterName}
                  onChangeText={setReporterName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="联系电话 *"
                  value={reporterPhone}
                  onChangeText={setReporterPhone}
                  keyboardType="phone-pad"
                />

                <Text style={styles.label}>与当事人关系</Text>
                <View style={styles.relationshipContainer}>
                  {relationshipOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.relationshipBtn,
                        relationship === option.value && styles.relationshipBtnSelected
                      ]}
                      onPress={() => setRelationship(option.value)}>
                      <Text
                        style={[
                          styles.relationshipText,
                          relationship === option.value && { color: colors.white }
                        ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 当事人信息 */}
              {relationship !== 'self' && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>当事人信息</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="当事人姓名"
                    value={victimName}
                    onChangeText={setVictimName}
                  />
                  <View style={styles.rowContainer}>
                    <View style={styles.halfContainer}>
                      <Text style={styles.label}>年龄</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="年龄"
                        value={victimAge}
                        onChangeText={setVictimAge}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.halfContainer}>
                      <Text style={styles.label}>性别</Text>
                      <View style={styles.genderContainer}>
                        {['male', 'female', 'other'].map((gender) => (
                          <TouchableOpacity
                            key={gender}
                            style={[
                              styles.genderBtn,
                              victimGender === gender && styles.genderBtnSelected
                            ]}
                            onPress={() => setVictimGender(gender)}>
                            <Text
                              style={[
                                styles.genderText,
                                victimGender === gender && { color: colors.white }
                              ]}>
                              {gender === 'male' ? '男' : gender === 'female' ? '女' : '其他'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={2}
                    placeholder="身体状况描述"
                    value={victimCondition}
                    onChangeText={setVictimCondition}
                    textAlignVertical="top"
                  />
                </View>
              )}

              {/* 位置信息 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>事发位置 *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="详细地址"
                  value={address}
                  onChangeText={setAddress}
                />

                <TouchableOpacity
                  style={styles.locationBtn}
                  onPress={getCurrentLocation}
                  disabled={locationLoading}>
                  {locationLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Icon name="location-on" size={20} color={colors.primary} />
                  )}
                  <Text style={styles.locationBtnText}>
                    {locationLoading ? '正在定位...' : currentLocation ? '重新定位' : '获取当前位置'}
                  </Text>
                </TouchableOpacity>

                {currentLocation && (
                  <View style={styles.locationInfo}>
                    <Icon name="check-circle" size={16} color={colors.success} />
                    <Text style={styles.locationText}>
                      已定位: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                    </Text>
                  </View>
                )}
              </View>

              {/* 现场图片/视频 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>现场图片/视频</Text>
                <TouchableOpacity style={styles.mediaBtn} onPress={selectMedia}>
                  <Icon name="add-photo-alternate" size={24} color={colors.primary} />
                  <Text style={styles.mediaBtnText}>添加图片或视频</Text>
                </TouchableOpacity>

                {mediaFiles.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.mediaList}>
                      {mediaFiles.map((file, index) => (
                        <View key={index} style={styles.mediaItem}>
                          <Image
                            source={{ uri: file.uri }}
                            style={styles.mediaImage}
                          />
                          <TouchableOpacity
                            style={styles.mediaRemove}
                            onPress={() => removeMedia(index)}>
                            <Icon name="close" size={16} color={colors.white} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
            </View>
          )}

          {/* 呼叫按钮 */}
          {selectedType && (
            <View style={styles.callButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.callButton,
                  active && styles.callButtonActive,
                  calling && styles.callButtonDisabled
                ]}
                onPress={handleEmergencyCall}
                disabled={calling}
                activeOpacity={0.8}>
                {calling ? (
                  <ActivityIndicator size="large" color={colors.white} />
                ) : (
                  <>
                    <Icon name="emergency" size={32} color={colors.white} />
                    <Text style={styles.callButtonText}>
                      {calling ? '正在呼叫...' : '确认应急呼叫'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {calling && (
                <Text style={styles.callingText}>
                  正在联系应急部门，请保持电话畅通...
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* 呼叫结果弹窗 */}
        {showResult && callResult && (
          <Modal visible={showResult} transparent animationType="fade">
            <View style={styles.resultOverlay}>
              <View style={styles.resultModal}>
                {callResult.success ? (
                  <View style={styles.successResult}>
                    <Icon name="check-circle" size={64} color={colors.success} />
                    <Text style={styles.resultTitle}>呼叫成功</Text>
                    <Text style={styles.resultMessage}>{callResult.message}</Text>

                    <View style={styles.resultInfo}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>事件编号:</Text>
                        <Text style={styles.infoValue}>{callResult.eventNumber}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>应急级别:</Text>
                        <Text style={styles.infoValue}>{callResult.level}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>预计到达:</Text>
                        <Text style={styles.infoValue}>{callResult.estimatedArrival}</Text>
                      </View>
                    </View>

                    <Text style={styles.emergencyInstructions}>
                      {callResult.emergencyInstructions?.immediate}
                    </Text>

                    <View style={styles.resultActions}>
                      <TouchableOpacity
                        style={[styles.resultBtn, styles.primaryBtn]}
                        onPress={() => {
                          setShowResult(false);
                          // 可以导航到应急事件详情页
                          navigation.navigate('EmergencyDetail', {
                            eventId: callResult.eventId
                          });
                        }}>
                        <Text style={styles.resultBtnText}>查看详情</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.resultBtn, styles.secondaryBtn]}
                        onPress={() => {
                          setShowResult(false);
                          resetForm();
                          onClose();
                        }}>
                        <Text style={[styles.resultBtnText, { color: colors.primary }]}>
                          完成
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.errorResult}>
                    <Icon name="error" size={64} color={colors.error} />
                    <Text style={styles.resultTitle}>呼叫失败</Text>
                    <Text style={styles.resultMessage}>{callResult.message}</Text>

                    <TouchableOpacity
                      style={[styles.resultBtn, styles.primaryBtn]}
                      onPress={() => setShowResult(false)}>
                      <Text style={styles.resultBtnText}>重试</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    padding: 8,
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  quickSelectContainer: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  sectionTitle: {
    ...typography.h2,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  sectionSubtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  typesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  typeCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  typeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeName: {
    ...typography.h3,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  typeDescription: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtnText: {
    ...typography.body,
    fontSize: 16,
    color: colors.primary,
    marginLeft: 8,
  },
  selectedTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedTypeLabel: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectedType: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectedTypeText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginRight: 8,
  },
  section: {
    marginBottom: 24,
  },
  urgencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  urgencyBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  urgencyText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '500',
  },
  textArea: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  label: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  vulnerableContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vulnerableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  vulnerableBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  vulnerableText: {
    ...typography.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  relationshipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relationshipBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  relationshipBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  relationshipText: {
    ...typography.body,
    fontSize: 14,
    color: colors.text,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfContainer: {
    flex: 1,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  genderBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderText: {
    ...typography.body,
    fontSize: 14,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
  },
  locationBtnText: {
    ...typography.body,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
    gap: 8,
  },
  locationText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.text,
  },
  mediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  mediaBtnText: {
    ...typography.body,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  mediaList: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  mediaItem: {
    position: 'relative',
  },
  mediaImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  mediaRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  callButton: {
    backgroundColor: colors.error,
    borderRadius: 50,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  callButtonActive: {
    animation: 'pulse 1.5s infinite',
  },
  callButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.7,
  },
  callButtonText: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  callingText: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  resultOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  resultModal: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  successResult: {
    alignItems: 'center',
  },
  resultTitle: {
    ...typography.h2,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  resultMessage: {
    ...typography.body,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  resultInfo: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoRow:lastChild: {
    marginBottom: 0,
  },
  infoLabel: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.body,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  emergencyInstructions: {
    ...typography.body,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.warning + '20',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    marginBottom: 24,
    lineHeight: 20,
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  resultBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
  },
  secondaryBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  resultBtnText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '500',
    color: colors.white,
  },
});

export default EmergencyCall;