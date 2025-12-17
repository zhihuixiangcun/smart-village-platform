# VPC Module for Smart Village Platform
module "vpc" {
  source = "./modules/vpc"

  name               = local.cluster_name
  cidr               = local.vpc_cidr
  azs                = local.azs
  private_subnets    = local.private_subnets
  public_subnets     = local.public_subnets
  database_subnets   = local.database_subnets

  enable_nat_gateway     = true
  enable_vpn_gateway     = false
  enable_dns_hostnames   = true
  enable_dns_support     = true
  enable_flow_log        = var.enable_vpc_flow_logs
  
  # Tags
  tags = local.common_tags
  
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }
  
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }
}

# EKS Cluster
module "eks" {
  source = "./modules/eks"

  cluster_name                    = local.cluster_name
  cluster_version                = var.kubernetes_version
  cluster_endpoint_private_access = true
  cluster_endpoint_public_access  = true
  cluster_endpoint_public_access_cidrs = var.allowed_cidr_blocks

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  control_plane_subnet_ids       = module.vpc.private_subnets

  # Security groups
  cluster_additional_security_group_ids = [aws_security_group.eks_additional.id]
  
  # IRSA
  enable_irsa = true

  # Node groups
  eks_managed_node_groups = {
    for name, config in var.eks_node_groups : name => {
      instance_types = config.instance_types
      capacity_type  = config.capacity_type
      
      min_size     = config.min_size
      max_size     = config.max_size
      desired_size = config.desired_size
      
      disk_size = config.disk_size
      ami_type  = config.ami_type
      
      labels = config.labels
      taints = config.taints
      
      vpc_security_group_ids = [aws_security_group.eks_nodes.id]
      
      # Enable Systems Manager
      enable_bootstrap_user_data = true
      bootstrap_extra_args       = "--enable-docker-bridge true"
      
      metadata_options = {
        http_endpoint               = "enabled"
        http_tokens                 = "required"
        http_put_response_hop_limit = 2
      }
    }
  }

  # Cluster encryption
  cluster_encryption_config = [
    {
      provider_key_arn = aws_kms_key.eks.arn
      resources        = ["secrets"]
    }
  ]

  tags = local.common_tags
}

# Security Groups
resource "aws_security_group" "eks_additional" {
  name_prefix = "${local.cluster_name}-additional"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port = 443
    to_port   = 443
    protocol  = "tcp"
    cidr_blocks = [local.vpc_cidr]
  }

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-eks-additional"
  })
}

resource "aws_security_group" "eks_nodes" {
  name_prefix = "${local.cluster_name}-nodes"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    self      = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-eks-nodes"
  })
}

# KMS Key for EKS encryption
resource "aws_kms_key" "eks" {
  description             = "EKS Secret Encryption Key"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-eks"
  })
}

resource "aws_kms_alias" "eks" {
  name          = "alias/${local.cluster_name}-eks"
  target_key_id = aws_kms_key.eks.key_id
}

# RDS Aurora Cluster for production database
module "aurora" {
  source = "./modules/aurora"

  name              = "${local.cluster_name}-aurora"
  engine            = "aurora-mysql"
  engine_version    = var.rds_config.engine_version
  instance_class    = var.rds_config.instance_class
  instances         = {
    writer = {}
    reader = {}
  }

  vpc_id               = module.vpc.vpc_id
  subnets              = module.vpc.database_subnets
  create_security_group = true
  allowed_security_groups = [aws_security_group.eks_nodes.id]
  allowed_cidr_blocks     = [local.vpc_cidr]

  storage_encrypted   = var.rds_config.storage_encrypted
  apply_immediately   = false
  monitoring_interval = 60

  enabled_cloudwatch_logs_exports = ["error", "general", "slowquery"]

  backup_retention_period = var.rds_config.backup_retention_period
  preferred_backup_window = var.rds_config.backup_window
  preferred_maintenance_window = var.rds_config.maintenance_window

  deletion_protection = var.rds_config.deletion_protection
  skip_final_snapshot = false
  final_snapshot_identifier = "${local.cluster_name}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  # Database credentials
  master_username = "smartvillage"
  master_password = random_password.mongodb_password.result

  tags = local.common_tags
}

# ElastiCache Redis Cluster
module "redis" {
  source = "./modules/elasticache"

  name        = "${local.cluster_name}-redis"
  description = "Redis cluster for Smart Village Platform"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.database_subnets

  # Cluster configuration
  node_type                      = var.elasticache_config.node_type
  num_cache_nodes               = var.elasticache_config.num_cache_nodes
  port                          = var.elasticache_config.port
  parameter_group_name          = var.elasticache_config.parameter_group_name
  engine_version                = var.elasticache_config.engine_version
  
  # Security
  at_rest_encryption_enabled = var.elasticache_config.at_rest_encryption_enabled
  transit_encryption_enabled = var.elasticache_config.transit_encryption_enabled
  auth_token                 = random_password.redis_password.result

  # Network security
  allowed_security_groups = [aws_security_group.eks_nodes.id]
  allowed_cidr_blocks     = [local.vpc_cidr]

  # Maintenance
  preferred_maintenance_window = "sun:05:00-sun:06:00"
  snapshot_retention_limit     = 7
  snapshot_window              = "06:00-07:00"

  tags = local.common_tags
}

# S3 Buckets for application storage
resource "aws_s3_bucket" "uploads" {
  bucket = "${local.cluster_name}-uploads"

  tags = merge(local.common_tags, {
    Name        = "${local.cluster_name}-uploads"
    Description = "File uploads for Smart Village Platform"
  })
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = aws_kms_key.s3.arn
        sse_algorithm     = "aws:kms"
      }
    }
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# KMS Key for S3 encryption
resource "aws_kms_key" "s3" {
  description             = "S3 Bucket Encryption Key"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-s3"
  })
}

resource "aws_kms_alias" "s3" {
  name          = "alias/${local.cluster_name}-s3"
  target_key_id = aws_kms_key.s3.key_id
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "application_logs" {
  name              = "/aws/eks/${local.cluster_name}/application"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.cloudwatch.arn

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "audit_logs" {
  name              = "/aws/eks/${local.cluster_name}/audit"
  retention_in_days = var.log_retention_days * 3  # Keep audit logs longer
  kms_key_id        = aws_kms_key.cloudwatch.arn

  tags = local.common_tags
}

# KMS Key for CloudWatch logs
resource "aws_kms_key" "cloudwatch" {
  description             = "CloudWatch Logs Encryption Key"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow CloudWatch Logs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${var.aws_region}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-cloudwatch"
  })
}

resource "aws_kms_alias" "cloudwatch" {
  name          = "alias/${local.cluster_name}-cloudwatch"
  target_key_id = aws_kms_key.cloudwatch.key_id
}