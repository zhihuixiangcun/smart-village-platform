"""
语音命令处理服务
支持自然语言理解、意图识别和实体提取
"""

import asyncio
import json
import logging
import re
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import jieba
import jieba.posseg as pseg
from collections import defaultdict

class VoiceCommandService:
    """语音命令处理服务类"""

    def __init__(self, config: Dict[str, Any]):
        """
        初始化语音命令服务

        Args:
            config: 配置字典
        """
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.request_count = 0
        self.success_count = 0
        error_count = 0

        # 初始化jieba分词
        self._initialize_jieba()

        # 唤醒词列表
        self.wake_words = set(config.get('wake_words', ['小智', '村小助手', '智慧乡村']))

        # 命令模式配置
        self.command_patterns = config.get('commands', {})
        self.confidence_threshold = config.get('confidence_threshold', 0.6)
        self.max_retries = config.get('max_retries', 3)

        # 意图定义
        self.intent_patterns = {
            'query_info': {
                'keywords': ['查询', '显示', '看看', '找', '搜索', '查', '看', '问'],
                'entities': ['村民', '公告', '政策', '补贴', '费用', '信息', '情况'],
                'responses': ['正在为您查询{entity}...', '正在查找{entity}信息...', '查询{entity}中...']
            },
            'handle_action': {
                'keywords': ['执行', '操作', '处理', '办理', '申请', '提交', '完成'],
                'entities': ['医保', '社保', '身份证', '户口', '结婚证', '准生证', '证明'],
                'responses': ['正在为您办理{entity}...', '准备处理{entity}申请...', '启动{entity}办理流程...']
            },
            'navigate_page': {
                'keywords': ['打开', '进入', '跳转到', '切换到', '去', '到', '访问'],
                'entities': ['首页', '主页', '个人中心', '我的', '服务大厅', '办事', '公告栏', '消息'],
                'responses': ['正在跳转到{entity}...', '正在打开{entity}页面...', '切换到{entity}...']
            },
            'get_help': {
                'keywords': ['帮助', '怎么用', '使用指南', '说明', '指导'],
                'entities': [],
                'responses': ['为您提供使用帮助...', '这是使用指南...', '让我帮您了解如何使用...']
            },
            'emergency_call': {
                'keywords': ['紧急', '求救', '报警', '急救', '救命', '火警', '救护车'],
                'entities': ['医疗', '消防', '公安', '急救'],
                'responses': ['紧急求助已发送！', '正在联系相关部门...', '紧急处理中，请保持冷静...']
            },
            'weather_query': {
                'keywords': ['天气', '温度', '降雨', '下雨', '晴天', '阴天', '预报'],
                'entities': ['今天', '明天', '后天', '上午', '下午', '晚上'],
                'responses': ['正在查询天气信息...', '获取天气预报中...']
            },
            'service_apply': {
                'keywords': ['申请', '办理', '提交', '登记'],
                'entities': ['补贴', '救助', '福利', '保险', '补助', '津贴'],
                'responses': ['正在准备{entity}申请...', '启动{entity}申请流程...']
            }
        }

        # 实体类型定义
        self.entity_types = {
            'person': ['村民', '人员', '户主', '家庭成员', '老人', '儿童', '党员'],
            'document': ['身份证', '户口本', '结婚证', '出生证', '房产证', '土地证'],
            'policy': ['政策', '规定', '办法', '条例', '通知', '文件'],
            'benefit': ['补贴', '补助', '津贴', '福利', '救助', '救济'],
            'service': ['医保', '社保', '养老', '医疗', '教育', '就业'],
            'location': ['村委会', '卫生站', '学校', '文化站', '超市', '银行', '邮局'],
            'time': ['今天', '明天', '后天', '上午', '下午', '晚上', '现在'],
            'number': ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
        }

        # 上下文记忆
        self.context_memory = {}
        self.max_context_length = config.get('context_memory', 10)

    def _initialize_jieba(self):
        """初始化jieba分词器"""
        try:
            # 加载自定义词典
            self._load_custom_dictionary()

            # 添加专业词汇
            self._add_domain_words()

            self.logger.info("jieba分词器初始化成功")

        except Exception as e:
            self.logger.error(f"jieba初始化失败: {e}")

    def _load_custom_dictionary(self):
        """加载自定义词典"""
        # 农村相关词汇
        domain_words = [
            # 村务相关
            '村委会', '村长', '村支书', '村委', '村民', '户口', '户籍', '常住人口',
            # 政策相关
            '新农村', '乡村振兴', '精准扶贫', '农业补贴', '耕地保护', '粮食补贴',
            # 服务相关
            '医保', '社保', '养老保险', '医疗保险', '低保', '五保', '残疾补助',
            # 办事相关
            '准生证', '出生证明', '死亡证明', '婚姻证明', '流动人口证', '居住证',
            # 紧急相关
            '120', '110', '119', '急救', '消防', '报警', '求救'
        ]

        for word in domain_words:
            jieba.add_word(word, freq=1000)

    def _add_domain_words(self):
        """添加领域词汇"""
        # 添加更多农村政务相关的词汇
        additional_words = [
            # 方言词汇
            '嘎', '呢', '嘛', '呗', '哈', '啊', '哦', '呀', '咧', '咯',
            # 地方特色词汇
            '村务公开', '三务公开', '民主监督', '村民议事', '一事一议',
            # 数字转换
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
        ]

        for word in additional_words:
            jieba.add_word(word)

    async def process(self, text: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        处理语音命令

        Args:
            text: 用户输入文本
            context: 对话上下文

        Returns:
            处理结果
        """
        self.request_count += 1
        start_time = datetime.now()

        try:
            # 更新上下文
            if context:
                self._update_context(context)

            # 文本预处理
            cleaned_text = self._preprocess_text(text)

            # 检测唤醒词
            has_wake_word = self._detect_wake_word(cleaned_text)

            # 意图识别
            intent_result = await self._recognize_intent(cleaned_text)

            # 实体提取
            entities = await self._extract_entities(cleaned_text, intent_result['intent'])

            # 生成响应
            response = self._generate_response(intent_result, entities)

            # 执行命令
            command_result = await self._execute_command(intent_result, entities)

            duration = (datetime.now() - start_time).total_seconds()
            self.success_count += 1

            self.logger.info(
                f"语音命令处理完成: {intent_result['intent']} "
                f"(置信度: {intent_result['confidence']:.3f}, "
                f"用时: {duration:.3f}s)"
            )

            return {
                'success': True,
                'text': text,
                'cleaned_text': cleaned_text,
                'has_wake_word': has_wake_word,
                'intent': intent_result,
                'entities': entities,
                'response': response,
                'command_result': command_result,
                'context': self._get_current_context()
            }

        except Exception as e:
            self.error_count += 1
            self.logger.error(f"语音命令处理失败: {e}")

            return {
                'success': False,
                'text': text,
                'error': str(e),
                'intent': None,
                'entities': [],
                'response': '抱歉，处理您的要求时遇到了问题，请重试。'
            }

    def _preprocess_text(self, text: str) -> str:
        """
        文本预处理

        Args:
            text: 原始文本

        Returns:
            预处理后的文本
        """
        # 去除多余的空格和标点
        text = re.sub(r'\s+', ' ', text.strip())

        # 统一标点符号
        text = text.replace('！', '！').replace('？', '？').replace('。', '。')

        # 处理常见的语音识别错误
        corrections = {
            '村小智': '村小助手',
            '智慧村庄': '智慧乡村',
            '政务办理': '村务办理',
            '新农合': '医保'
        }

        for wrong, correct in corrections.items():
            text = text.replace(wrong, correct)

        return text

    def _detect_wake_word(self, text: str) -> bool:
        """
        检测唤醒词

        Args:
            text: 输入文本

        Returns:
            是否包含唤醒词
        """
        text_lower = text.lower()
        return any(wake_word in text_lower for wake_word in self.wake_words)

    async def _recognize_intent(self, text: str) -> Dict[str, Any]:
        """
        意图识别

        Args:
            text: 输入文本

        Returns:
            意图识别结果
        """
        # 分词和词性标注
        words = list(jieba.cut(text))
        words_with_pos = list(pseg.cut(text))

        # 计算各意图的匹配度
        intent_scores = {}

        for intent, pattern in self.intent_patterns.items():
            score = 0.0
            keyword_matches = 0
            entity_matches = 0

            # 关键词匹配
            for keyword in pattern['keywords']:
                if keyword in text:
                    keyword_matches += 1
                    score += 0.3

            # 实体匹配
            for entity_type in pattern['entities']:
                if entity_type in text:
                    entity_matches += 1
                    score += 0.2

            # 词序和位置权重
            for i, (word, pos) in enumerate(words_with_pos):
                # 动词和名词权重更高
                if pos.startswith('v') or pos.startswith('n'):
                    score += 0.1

                # 关键词位置权重
                if word in pattern['keywords']:
                    # 关键词越靠前，权重越高
                    position_weight = 1.0 - (i / len(words))
                    score += 0.2 * position_weight

            # 归一化分数
            if keyword_matches > 0 or entity_matches > 0:
                max_possible = len(pattern['keywords']) * 0.3 + len(pattern['entities']) * 0.2
                score = min(score / max_possible, 1.0)
                intent_scores[intent] = score

        # 选择最佳意图
        if intent_scores:
            best_intent = max(intent_scores.items(), key=lambda x: x[1])
            intent_name, confidence = best_intent
        else:
            intent_name = 'unknown'
            confidence = 0.0

        # 如果置信度太低，标记为未知意图
        if confidence < self.confidence_threshold:
            intent_name = 'unknown'

        return {
            'intent': intent_name,
            'confidence': confidence,
            'all_scores': intent_scores,
            'keywords_found': [w for w in words if w in sum([p['keywords'] for p in self.intent_patterns.values()], [])],
            'words': words,
            'words_with_pos': [(w, p) for w, p in words_with_pos]
        }

    async def _extract_entities(self, text: str, intent: str) -> List[Dict[str, Any]]:
        """
        实体提取

        Args:
            text: 输入文本
            intent: 识别的意图

        Returns:
            提取的实体列表
        """
        entities = []

        # 基于规则的实体提取
        for entity_type, entity_words in self.entity_types.items():
            for word in entity_words:
                if word in text:
                    # 计算实体位置
                    start = text.find(word)
                    end = start + len(word)

                    entities.append({
                        'type': entity_type,
                        'value': word,
                        'start': start,
                        'end': end,
                        'confidence': 0.8
                    })

        # 意图相关的实体提取
        if intent in self.intent_patterns:
            intent_entities = self.intent_patterns[intent]['entities']
            for entity_word in intent_entities:
                if entity_word in text:
                    start = text.find(entity_word)
                    end = start + len(entity_word)

                    # 避免重复
                    if not any(e['value'] == entity_word for e in entities):
                        entities.append({
                            'type': 'intent_entity',
                            'value': entity_word,
                            'start': start,
                            'end': end,
                            'confidence': 0.9
                        })

        # 数字提取
        numbers = re.findall(r'\d+', text)
        for num in numbers:
            start = text.find(num)
            end = start + len(num)

            entities.append({
                'type': 'number',
                'value': int(num),
                'text': num,
                'start': start,
                'end': end,
                'confidence': 1.0
            })

        # 时间提取
        time_patterns = {
            '今天': 'today',
            '明天': 'tomorrow',
            '后天': 'day_after_tomorrow',
            '上午': 'morning',
            '下午': 'afternoon',
            '晚上': 'evening',
            '现在': 'now'
        }

        for time_text, time_value in time_patterns.items():
            if time_text in text:
                start = text.find(time_text)
                end = start + len(time_text)

                entities.append({
                    'type': 'time',
                    'value': time_value,
                    'text': time_text,
                    'start': start,
                    'end': end,
                    'confidence': 0.9
                })

        return entities

    def _generate_response(self, intent_result: Dict[str, Any], entities: List[Dict[str, Any]]) -> str:
        """
        生成响应文本

        Args:
            intent_result: 意图识别结果
            entities: 提取的实体

        Returns:
            响应文本
        """
        intent = intent_result['intent']
        confidence = intent_result['confidence']

        # 如果置信度太低，请求澄清
        if confidence < 0.5:
            return "抱歉，我没有完全理解您的要求。请您再详细说明一下。"

        # 根据意图生成响应
        if intent == 'unknown':
            return "抱歉，我不太明白您的意思。您可以说'帮助'查看支持的指令。"

        if intent not in self.intent_patterns:
            return "抱歉，这个功能我暂时还不能处理。"

        pattern = self.intent_patterns[intent]

        # 如果找到相关实体，使用模板响应
        intent_entities = [e for e in entities if e['type'] == 'intent_entity']
        if intent_entities:
            entity_value = intent_entities[0]['value']
            response_templates = pattern['responses']
            response = response_templates[0].format(entity=entity_value)
        else:
            # 使用默认响应
            response = f"正在处理您的{intent}请求..."

        return response

    async def _execute_command(self, intent_result: Dict[str, Any], entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        执行语音命令

        Args:
            intent_result: 意图识别结果
            entities: 提取的实体

        Returns:
            命令执行结果
        """
        intent = intent_result['intent']

        command_result = {
            'success': True,
            'action': intent,
            'parameters': {},
            'result': None
        }

        try:
            # 根据意图执行不同的操作
            if intent == 'query_info':
                command_result = await self._execute_query_command(entities)

            elif intent == 'handle_action':
                command_result = await self._execute_action_command(entities)

            elif intent == 'navigate_page':
                command_result = await self._execute_navigate_command(entities)

            elif intent == 'get_help':
                command_result = await self._execute_help_command()

            elif intent == 'emergency_call':
                command_result = await self._execute_emergency_command(entities)

            elif intent == 'weather_query':
                command_result = await self._execute_weather_command(entities)

            elif intent == 'service_apply':
                command_result = await self._execute_service_command(entities)

            else:
                command_result = {
                    'success': False,
                    'action': intent,
                    'message': '暂不支持的操作'
                }

        except Exception as e:
            self.logger.error(f"命令执行失败: {e}")
            command_result = {
                'success': False,
                'action': intent,
                'error': str(e),
                'message': '命令执行失败，请稍后重试'
            }

        return command_result

    async def _execute_query_command(self, entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """执行查询命令"""
        # 这里应该调用实际的查询服务
        query_type = None

        for entity in entities:
            if entity['type'] in ['intent_entity', 'person', 'document', 'policy', 'benefit']:
                query_type = entity['value']
                break

        if query_type:
            return {
                'success': True,
                'action': 'query',
                'query_type': query_type,
                'message': f'查询{query_type}成功',
                'data': f'这是{query_type}的查询结果'  # 实际应该返回真实数据
            }
        else:
            return {
                'success': False,
                'action': 'query',
                'message': '请指定要查询的内容'
            }

    async def _execute_action_command(self, entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """执行操作命令"""
        action_type = None

        for entity in entities:
            if entity['type'] in ['intent_entity', 'service', 'document']:
                action_type = entity['value']
                break

        if action_type:
            return {
                'success': True,
                'action': 'handle',
                'action_type': action_type,
                'message': f'正在为您办理{action_type}',
                'application_id': f'APP{datetime.now().strftime("%Y%m%d%H%M%S")}'
            }
        else:
            return {
                'success': False,
                'action': 'handle',
                'message': '请指定要办理的业务'
            }

    async def _execute_navigate_command(self, entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """执行导航命令"""
        target_page = None

        for entity in entities:
            if entity['type'] in ['intent_entity', 'location']:
                target_page = entity['value']
                break

        # 页面映射
        page_mapping = {
            '首页': '/home',
            '主页': '/home',
            '个人中心': '/profile',
            '我的': '/profile',
            '服务大厅': '/services',
            '办事': '/services',
            '公告栏': '/announcements',
            '消息': '/messages'
        }

        page_url = page_mapping.get(target_page, '/')

        return {
            'success': True,
            'action': 'navigate',
            'target_page': target_page,
            'url': page_url,
            'message': f'正在跳转到{target_page}'
        }

    async def _execute_help_command(self) -> Dict[str, Any]:
        """执行帮助命令"""
        help_content = {
            'available_commands': [
                '查询村民信息',
                '查看最新公告',
                '办理医保社保',
                '申请各项补贴',
                '查看天气信息',
                '紧急情况求助'
            ],
            'wake_words': list(self.wake_words),
            'tips': [
                '说出"小智"或"村小助手"可以唤醒我',
                '请用清晰的语言描述您的需求',
                '支持的方言包括普通话、粤语、四川话等'
            ]
        }

        return {
            'success': True,
            'action': 'help',
            'message': '为您提供使用帮助',
            'data': help_content
        }

    async def _execute_emergency_command(self, entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """执行紧急求助命令"""
        emergency_type = 'general'

        for entity in entities:
            if entity['value'] in ['医疗', '急救']:
                emergency_type = 'medical'
            elif entity['value'] in ['消防', '火警']:
                emergency_type = 'fire'
            elif entity['value'] in ['公安', '报警']:
                emergency_type = 'police'
            break

        emergency_numbers = {
            'medical': '120',
            'fire': '119',
            'police': '110',
            'general': '110'
        }

        return {
            'success': True,
            'action': 'emergency',
            'emergency_type': emergency_type,
            'emergency_number': emergency_numbers[emergency_type],
            'message': f'紧急求助已发送！请拨打{emergency_numbers[emergency_type]}',
            'timestamp': datetime.now().isoformat()
        }

    async def _execute_weather_command(self, entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """执行天气查询命令"""
        time_entity = None

        for entity in entities:
            if entity['type'] == 'time':
                time_entity = entity['value']
                break

        # 这里应该调用实际的天气API
        weather_data = {
            'temperature': '25°C',
            'condition': '晴',
            'humidity': '60%',
            'wind': '东南风2级'
        }

        time_text = time_entity or '今天'

        return {
            'success': True,
            'action': 'weather',
            'time': time_text,
            'message': f'{time_text}天气：{weather_data["temperature"]}，{weather_data["condition"]}',
            'data': weather_data
        }

    async def _execute_service_command(self, entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """执行服务申请命令"""
        service_type = None

        for entity in entities:
            if entity['type'] in ['intent_entity', 'benefit', 'service']:
                service_type = entity['value']
                break

        if service_type:
            return {
                'success': True,
                'action': 'apply',
                'service_type': service_type,
                'message': f'正在为您申请{service_type}',
                'application_id': f'APP{datetime.now().strftime("%Y%m%d%H%M%S")}'
            }
        else:
            return {
                'success': False,
                'action': 'apply',
                'message': '请指定要申请的服务类型'
            }

    def _update_context(self, context: Dict[str, Any]):
        """更新对话上下文"""
        user_id = context.get('user_id', 'default')

        if user_id not in self.context_memory:
            self.context_memory[user_id] = []

        # 添加新的上下文
        self.context_memory[user_id].append({
            'timestamp': datetime.now().isoformat(),
            'context': context
        })

        # 保持上下文长度
        if len(self.context_memory[user_id]) > self.max_context_length:
            self.context_memory[user_id] = self.context_memory[user_id][-self.max_context_length:]

    def _get_current_context(self) -> Dict[str, Any]:
        """获取当前上下文"""
        # 简化实现，返回最近的上下文
        if self.context_memory:
            latest_user = list(self.context_memory.keys())[-1]
            if self.context_memory[latest_user]:
                return self.context_memory[latest_user][-1]['context']

        return {}

    def is_available(self) -> bool:
        """检查服务是否可用"""
        return True

    def get_metrics(self) -> Dict[str, Any]:
        """获取服务指标"""
        success_rate = self.success_count / max(self.request_count, 1) * 100

        return {
            'request_count': self.request_count,
            'success_count': self.success_count,
            'error_count': self.error_count,
            'success_rate': round(success_rate, 2),
            'supported_intents': list(self.intent_patterns.keys()),
            'wake_words_count': len(self.wake_words),
            'context_memory_size': len(self.context_memory)
        }