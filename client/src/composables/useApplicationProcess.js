/**
 * 办事流程通用组件
 * 支持快速生成各类申请流程
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useLargeText } from '@/composables/useLargeText'
import { profileApi } from '@/api/residentProfile'
import { serviceApi } from '@/api/service'

export function useApplicationProcess(config) {
  const { serviceType, serviceName, steps, formFields } = config
  const { isLargeText } = useLargeText()

  // 表单数据
  const formData = reactive({})

  // 初始化表单字段
  const initFormData = () => {
    formFields.forEach(field => {
      formData[field.key] = field.defaultValue || ''
    })

    // 加载用户信息
    loadUserInfo()
  }

  // 加载用户信息
  const loadUserInfo = async () => {
    try {
      const response = await profileApi.getMyProfile()
      const profile = response.data

      if (profile) {
        // 自动填充用户信息
        const mapping = {
          name: profile.personalInfo?.name || '',
          idCard: profile.personalInfo?.idCard || '',
          gender: profile.personalInfo?.gender || '',
          phone: profile.contact?.phone || '',
          address: profile.contact?.address || '',
          birthDate: profile.personalInfo?.birthDate || ''
        }

        Object.assign(formData, mapping)
      }
    } catch (error) {
      console.error('Load user info error:', error)
    }
  }

  // 生成表单验证规则
  const generateRules = (field) => {
    const rules = []

    if (field.required) {
      rules.push({ required: true, message: \`请输入\${field.label}\`, trigger: 'blur' })
    }

    if (field.type === 'phone') {
      rules.push({
        pattern: /^1[3-9]\\d{9}$/,
        message: '请输入正确的手机号',
        trigger: 'blur'
      })
    }

    if (field.type === 'idCard') {
      rules.push({
        pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\\d|X|x)$)/,
        message: '请输入正确的身份证号',
        trigger: 'blur'
      })
    }

    if (field.type === 'email') {
      rules.push({
        type: 'email',
        message: '请输入正确的邮箱地址',
        trigger: 'blur'
      })
    }

    return rules
  }

  // 提交申请
  const submitApplication = async (additionalData = {}) => {
    try {
      const submitData = {
        ...formData,
        ...additionalData,
        serviceType,
        serviceName
      }

      const response = await serviceApi.submitApplication(submitData)

      ElMessage.success('申请已提交,请耐心等待审核')
      return response
    } catch (error) {
      ElMessage.error('提交失败: ' + error.message)
      throw error
    }
  }

  // 计算属性
  const progress = computed(() => {
    return steps.length > 0 ? 100 / steps.length : 0
  })

  // 生命周期
  onMounted(() => {
    initFormData()
  })

  return {
    formData,
    initFormData,
    generateRules,
    submitApplication,
    progress
  }
}

/**
 * 通用办事流程字段配置
 */
export const applicationFieldTypes = {
  // 基础信息字段
  text: {
    component: 'el-input',
    props: {
      type: 'text',
      placeholder: '请输入'
    }
  },

  textarea: {
    component: 'el-input',
    props: {
      type: 'textarea',
      rows: 3,
      placeholder: '请输入'
    }
  },

  number: {
    component: 'el-input-number',
    props: {
      min: 0,
      placeholder: '请输入数字'
    }
  },

  phone: {
    component: 'el-input',
    props: {
      type: 'tel',
      placeholder: '请输入手机号',
      maxlength: 11
    }
  },

  idCard: {
    component: 'el-input',
    props: {
      placeholder: '请输入身份证号',
      maxlength: 18
    }
  },

  email: {
    component: 'el-input',
    props: {
      type: 'email',
      placeholder: '请输入邮箱'
    }
  },

  date: {
    component: 'el-date-picker',
    props: {
      type: 'date',
      format: 'YYYY-MM-DD',
      valueFormat: 'YYYY-MM-DD',
      placeholder: '选择日期'
    }
  },

  select: {
    component: 'el-select',
    props: {
      placeholder: '请选择'
    }
  },

  radio: {
    component: 'el-radio-group',
    props: {}
  },

  checkbox: {
    component: 'el-checkbox-group',
    props: {}
  },

  cascade: {
    component: 'el-cascader',
    props: {
      placeholder: '请选择'
    }
  },

  file: {
    component: 'ImageUploader',
    props: {}
  }
}

/**
 * 预定义的办事流程配置
 */
export const applicationConfigs = {
  // 结婚登记预约
  marriageRegistration: {
    serviceType: 'marriage',
    serviceName: '结婚登记预约',
    steps: [
      { title: '基本信息', description: '填写双方基本信息' },
      { title: '材料上传', description: '上传所需证件' },
      { title: '选择时间', description: '选择登记时间' },
      { title: '确认提交', description: '核对信息并提交' }
    ],
    formFields: [
      { key: 'manName', label: '男方姓名', type: 'text', required: true },
      { key: 'manIdCard', label: '男方身份证', type: 'idCard', required: true },
      { key: 'manPhone', label: '男方电话', type: 'phone', required: true },
      { key: 'womanName', label: '女方姓名', type: 'text', required: true },
      { key: 'womanIdCard', label: '女方身份证', type: 'idCard', required: true },
      { key: 'womanPhone', label: '女方电话', type: 'phone', required: true },
      { key: 'registrationDate', label: '登记日期', type: 'date', required: true },
      { key: 'registrationOffice', label: '登记机关', type: 'select', required: true, options: [] },
      { key: 'witness', label: '见证人', type: 'text', required: false }
    ]
  },

  // 低保申请
  subsistenceAllowance: {
    serviceType: 'subsistence',
    serviceName: '低保申请',
    steps: [
      { title: '家庭信息', description: '填写家庭基本情况' },
      { title: '收入情况', description: '填写家庭收入状况' },
      { title: '财产情况', description: '填写家庭财产状况' },
      { title: '材料上传', description: '上传证明材料' },
      { title: '确认提交', description: '核对信息并提交' }
    ],
    formFields: [
      { key: 'familyCount', label: '家庭人数', type: 'number', required: true, defaultValue: 1 },
      { key: 'headName', label: '户主姓名', type: 'text', required: true },
      { key: 'headIdCard', label: '户主身份证', type: 'idCard', required: true },
      { key: 'address', label: '家庭住址', type: 'textarea', required: true },
      { key: 'monthlyIncome', label: '月收入(元)', type: 'number', required: true },
      { key: 'incomeSource', label: '收入来源', type: 'textarea', required: true },
      { key: 'houseArea', label: '住房面积(㎡)', type: 'number', required: true },
      { key: 'hasHouse', label: '是否有房', type: 'radio', required: true, options: ['是', '否'] },
      { key: 'hasCar', label: '是否有车', type: 'radio', required: true, options: ['是', '否'] },
      { key: 'reason', label: '申请原因', type: 'textarea', required: true },
      { key: 'remark', label: '其他说明', type: 'textarea', required: false }
    ]
  },

  // 残疾补贴申请
  disabilityAllowance: {
    serviceType: 'disability',
    serviceName: '残疾补贴申请',
    steps: [
      { title: '个人信息', description: '填写个人基本信息' },
      { title: '残疾信息', description: '填写残疾相关信息' },
      { title: '银行信息', description: '填写收款账户' },
      { title: '材料上传', description: '上传证明材料' },
      { title: '确认提交', description: '核对信息并提交' }
    ],
    formFields: [
      { key: 'name', label: '姓名', type: 'text', required: true },
      { key: 'idCard', label: '身份证号', type: 'idCard', required: true },
      { key: 'phone', label: '联系电话', type: 'phone', required: true },
      { key: 'disabilityLevel', label: '残疾等级', type: 'select', required: true,
        options: ['一级', '二级', '三级', '四级'] },
      { key: 'disabilityType', label: '残疾类别', type: 'select', required: true,
        options: ['视力残疾', '听力残疾', '言语残疾', '肢体残疾', '智力残疾', '精神残疾', '多重残疾'] },
      { key: 'disabilityCard', label: '残疾证号', type: 'text', required: true },
      { key: 'bankName', label: '开户银行', type: 'select', required: true, options: [] },
      { key: 'bankAccount', label: '银行账号', type: 'text', required: true },
      { key: 'accountName', label: '户名', type: 'text', required: true },
      { key: 'reason', label: '申请原因', type: 'textarea', required: false }
    ]
  },

  // 老年补贴申请
  elderlyAllowance: {
    serviceType: 'elderly',
    serviceName: '老年补贴申请',
    steps: [
      { title: '基本信息', description: '填写个人基本信息' },
      { title: '补贴类型', description: '选择补贴类型' },
      { title: '银行信息', description: '填写收款账户' },
      { title: '材料上传', description: '上传证明材料' },
      { title: '确认提交', description: '核对信息并提交' }
    ],
    formFields: [
      { key: 'name', label: '姓名', type: 'text', required: true },
      { key: 'idCard', label: '身份证号', type: 'idCard', required: true },
      { key: 'phone', label: '联系电话', type: 'phone', required: true },
      { key: 'age', label: '年龄', type: 'number', required: true },
      { key: 'allowanceType', label: '补贴类型', type: 'select', required: true,
        options: ['高龄补贴(80-89岁)', '高龄补贴(90-99岁)', '高龄补贴(100岁以上)', '失能补贴', '其他'] },
      { key: 'bankName', label: '开户银行', type: 'select', required: true, options: [] },
      { key: 'bankAccount', label: '银行账号', type: 'text', required: true },
      { key: 'accountName', label: '户名', type: 'text', required: true },
      { key: 'remark', label: '备注', type: 'textarea', required: false }
    ]
  },

  // 建房申请
  houseBuilding: {
    serviceType: 'house-building',
    serviceName: '建房申请',
    steps: [
      { title: '基本信息', description: '填写个人基本信息' },
      { title: '建房信息', description: '填写建房相关内容' },
      { title: '地块信息', description: '填写建房地块信息' },
      { title: '材料上传', description: '上传证明材料' },
      { title: '确认提交', description: '核对信息并提交' }
    ],
    formFields: [
      { key: 'name', label: '申请人姓名', type: 'text', required: true },
      { key: 'idCard', label: '身份证号', type: 'idCard', required: true },
      { key: 'phone', label: '联系电话', type: 'phone', required: true },
      { key: 'familyCount', label: '家庭人口', type: 'number', required: true },
      { key: 'oldArea', label: '原住房面积(㎡)', type: 'number', required: true },
      { key: 'buildArea', label: '拟建面积(㎡)', type: 'number', required: true },
      { key: 'buildType', label: '建房类型', type: 'select', required: true,
        options: ['新建', '翻建', '扩建'] },
      { key: 'buildReason', label: '建房原因', type: 'textarea', required: true },
      { key: 'landLocation', label: '地块位置', type: 'textarea', required: true },
      { key: 'landArea', label: '地块面积(㎡)', type: 'number', required: true },
      { key: 'estimatedCost', label: '预估造价(万元)', type: 'number', required: true },
      { key: 'buildDate', label: '拟开工时间', type: 'date', required: false }
    ]
  },

  // 红白喜事申请
  eventApplication: {
    serviceType: 'event',
    serviceName: '红白喜事申请',
    steps: [
      { title: '基本信息', description: '填写个人基本信息' },
      { title: '活动信息', description: '填写活动相关信息' },
      { title: '需求说明', description: '说明具体需求' },
      { title: '确认提交', description: '核对信息并提交' }
    ],
    formFields: [
      { key: 'name', label: '申请人姓名', type: 'text', required: true },
      { key: 'phone', label: '联系电话', type: 'phone', required: true },
      { key: 'eventType', label: '活动类型', type: 'select', required: true,
        options: ['婚宴', '寿宴', '丧事', '满月酒', '升学宴', '乔迁宴', '其他'] },
      { key: 'eventDate', label: '活动日期', type: 'date', required: true },
      { key: 'guestCount', label: '预计人数', type: 'number', required: true },
      { key: 'location', label: '举办地点', type: 'select', required: true,
        options: ['家中', '村委会', '酒店', '饭店', '其他'] },
      { key: 'needs', label: '具体需求', type: 'textarea', required: true },
      { key: 'budget', label: '预算(元)', type: 'number', required: false },
      { key: 'remark', label: '备注', type: 'textarea', required: false }
    ]
  },

  // 交通补贴申请
  transportAllowance: {
    serviceType: 'transport',
    serviceName: '交通补贴申请',
    steps: [
      { title: '个人信息', description: '填写个人基本信息' },
      { title: '补贴类型', description: '选择补贴类型' },
      { key: 'bankInfo', title: '银行信息', description: '填写收款账户' },
      { title: '材料上传', description: '上传证明材料' },
      { title: '确认提交', description: '核对信息并提交' }
    ],
    formFields: [
      { key: 'name', label: '姓名', type: 'text', required: true },
      { key: 'idCard', label: '身份证号', type: 'idCard', required: true },
      { key: 'phone', label: '联系电话', type: 'phone', required: true },
      { key: 'allowanceType', label: '补贴类型', type: 'select', required: true,
        options: ['公交补贴', '地铁补贴', '火车票优惠', '其他'] },
      { key: 'commuteRoute', label: '通勤线路', type: 'textarea', required: false },
      { key: 'monthlyCost', label: '月交通费用(元)', type: 'number', required: true },
      { key: 'bankName', label: '开户银行', type: 'select', required: true, options: [] },
      { key: 'bankAccount', label: '银行账号', type: 'text', required: true },
      { key: 'accountName', label: '户名', type: 'text', required: true }
    ]
  },

  // 生育补贴申请
  birthAllowance: {
    serviceType: 'birth',
    serviceName: '生育补贴申请',
    steps: [
      { title: '基本信息', description: '填写个人基本信息' },
      { title: '生育信息', description: '填写生育相关信息' },
      { title: '银行信息', description: '填写收款账户' },
      { title: '材料上传', description: '上传证明材料' },
      { title: '确认提交', description: '核对信息并提交' }
    ],
    formFields: [
      { key: 'motherName', label: '产妇姓名', type: 'text', required: true },
      { key: 'motherIdCard', label: '产妇身份证', type: 'idCard', required: true },
      { key: 'phone', label: '联系电话', type: 'phone', required: true },
      { key: 'fatherName', label: '配偶姓名', type: 'text', required: true },
      { key: 'fatherIdCard', label: '配偶身份证', type: 'idCard', required: false },
      { key: 'babyName', label: '婴儿姓名', type: 'text', required: false },
      { key: 'birthDate', label: '出生日期', type: 'date', required: true },
      { key: 'birthType', label: '生育类型', type: 'select', required: true,
        options: ['一胎', '二胎', '多胎'] },
      { key: 'hospital', label: '出生医院', type: 'text', required: true },
      { key: 'bankName', label: '开户银行', type: 'select', required: true, options: [] },
      { key: 'bankAccount', label: '银行账号', type: 'text', required: true },
      { key: 'accountName', label: '户名', type: 'text', required: true },
      { key: 'remark', label: '备注', type: 'textarea', required: false }
    ]
  }
}

export default useApplicationProcess
