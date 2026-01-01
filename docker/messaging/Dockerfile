# RabbitMQ 消息队列服务
FROM rabbitmq:3.11-management-alpine

# 设置环境变量
ENV RABBITMQ_DEFAULT_USER=admin
ENV RABBITMQ_DEFAULT_PASS=admin123
ENV RABBITMQ_DEFAULT_VHOST=smart-village

# 创建自定义配置文件目录
RUN mkdir -p /etc/rabbitmq

# 复制配置文件
COPY rabbitmq.conf /etc/rabbitmq/rabbitmq.conf
COPY enabled_plugins /etc/rabbitmq/enabled_plugins
COPY definitions.json /etc/rabbitmq/definitions.json

# 设置权限
RUN chown -R rabbitmq:rabbitmq /etc/rabbitmq

# 暴露端口
EXPOSE 5672 15672 15674

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD rabbitmq-diagnostics -q ping

# 启动RabbitMQ
CMD ["rabbitmq-server"]