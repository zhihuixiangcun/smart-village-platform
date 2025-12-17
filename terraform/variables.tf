# Variables for Smart Village Platform Infrastructure

variable "aws_region" {
  description = "AWS region for infrastructure deployment"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "smart-village"
}

variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

# EKS Configuration
variable "eks_node_groups" {
  description = "EKS node group configurations"
  type = map(object({
    instance_types = list(string)
    capacity_type  = string
    min_size       = number
    max_size       = number
    desired_size   = number
    disk_size      = number
    ami_type       = string
    labels         = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
  }))
  
  default = {
    general = {
      instance_types = ["t3.medium", "t3.large"]
      capacity_type  = "ON_DEMAND"
      min_size       = 2
      max_size       = 10
      desired_size   = 3
      disk_size      = 50
      ami_type       = "AL2_x86_64"
      labels = {
        role = "general"
      }
      taints = []
    }
    
    database = {
      instance_types = ["r5.large", "r5.xlarge"]
      capacity_type  = "ON_DEMAND"
      min_size       = 1
      max_size       = 3
      desired_size   = 2
      disk_size      = 100
      ami_type       = "AL2_x86_64"
      labels = {
        role = "database"
      }
      taints = [{
        key    = "database"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
    
    monitoring = {
      instance_types = ["t3.large"]
      capacity_type  = "SPOT"
      min_size       = 1
      max_size       = 2
      desired_size   = 1
      disk_size      = 50
      ami_type       = "AL2_x86_64"
      labels = {
        role = "monitoring"
      }
      taints = [{
        key    = "monitoring"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  }
}

# RDS Configuration
variable "rds_config" {
  description = "RDS configuration for production database"
  type = object({
    engine_version    = string
    instance_class    = string
    allocated_storage = number
    max_allocated_storage = number
    storage_type      = string
    storage_encrypted = bool
    multi_az          = bool
    backup_retention_period = number
    backup_window     = string
    maintenance_window = string
    deletion_protection = bool
  })
  
  default = {
    engine_version          = "5.7.mysql_aurora.2.12.0"
    instance_class          = "db.r5.large"
    allocated_storage       = 100
    max_allocated_storage   = 1000
    storage_type           = "gp3"
    storage_encrypted      = true
    multi_az               = true
    backup_retention_period = 7
    backup_window          = "03:00-04:00"
    maintenance_window     = "sun:04:00-sun:05:00"
    deletion_protection    = true
  }
}

# ElastiCache Configuration
variable "elasticache_config" {
  description = "ElastiCache Redis configuration"
  type = object({
    node_type                = string
    num_cache_nodes         = number
    port                    = number
    parameter_group_name    = string
    engine_version          = string
    at_rest_encryption_enabled = bool
    transit_encryption_enabled = bool
  })
  
  default = {
    node_type                   = "cache.t3.micro"
    num_cache_nodes            = 2
    port                       = 6379
    parameter_group_name       = "default.redis7"
    engine_version             = "7.0"
    at_rest_encryption_enabled = true
    transit_encryption_enabled = true
  }
}

# Domain Configuration
variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
  default     = "smartvillage.com"
}

variable "certificate_arn" {
  description = "ARN of the SSL certificate for the domain"
  type        = string
  default     = ""
}

# Monitoring Configuration
variable "enable_monitoring" {
  description = "Enable comprehensive monitoring stack"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 30
}

# Security Configuration
variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the cluster"
  type        = list(string)
  default     = []
}

variable "enable_vpc_flow_logs" {
  description = "Enable VPC flow logs"
  type        = bool
  default     = true
}

variable "enable_guardduty" {
  description = "Enable AWS GuardDuty"
  type        = bool
  default     = true
}

# Backup Configuration
variable "backup_config" {
  description = "Backup configuration"
  type = object({
    enabled = bool
    schedule = string
    retention_days = number
  })
  
  default = {
    enabled        = true
    schedule      = "cron(0 2 * * ? *)"  # Daily at 2 AM UTC
    retention_days = 30
  }
}

# Auto Scaling Configuration
variable "autoscaling_config" {
  description = "Auto scaling configuration"
  type = object({
    enabled                = bool
    target_cpu_utilization = number
    target_memory_utilization = number
    scale_up_cooldown      = number
    scale_down_cooldown    = number
  })
  
  default = {
    enabled                   = true
    target_cpu_utilization   = 70
    target_memory_utilization = 80
    scale_up_cooldown        = 300   # 5 minutes
    scale_down_cooldown      = 600   # 10 minutes
  }
}

# Cost Optimization
variable "enable_spot_instances" {
  description = "Enable spot instances for non-critical workloads"
  type        = bool
  default     = true
}

variable "enable_reserved_instances" {
  description = "Use reserved instances for predictable workloads"
  type        = bool
  default     = false
}