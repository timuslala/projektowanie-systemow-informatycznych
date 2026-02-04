terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source = "hashicorp/random"
    }
  }
}

provider "aws" {
  region = "eu-central-1"
}

############################
# CLOUDWATCH
############################
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/studia"
  retention_in_days = 7
}

############################
# DEFAULT VPC
############################
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

############################
# ECS CLUSTER
############################
resource "aws_ecs_cluster" "this" {
  name = "studia-cluster"
}

############################
# ECR
############################
resource "aws_ecr_repository" "backend" {
  name         = "studia-backend"
  force_delete = true
}

resource "aws_ecr_repository" "frontend" {
  name         = "studia-frontend"
  force_delete = true
}

############################
# IAM
############################
resource "aws_iam_role" "ecs" {
  name = "studia-ecs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_admin" {
  role       = aws_iam_role.ecs.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

############################
# S3
############################
resource "random_id" "rand" {
  byte_length = 4
}

resource "aws_s3_bucket" "files" {
  bucket = "studia-files-${random_id.rand.hex}"
}

############################
# SECURITY GROUPS
############################
# ECS (frontend + backend)
resource "aws_security_group" "ecs" {
  name   = "studia-ecs"
  vpc_id = data.aws_vpc.default.id

  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# RDS
resource "aws_security_group" "rds" {
  name   = "studia-rds"
  vpc_id = data.aws_vpc.default.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

############################
# RDS POSTGRES
############################
resource "aws_db_subnet_group" "postgres" {
  name       = "studia-postgres-subnets"
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_db_instance" "postgres" {
  identifier             = "studia-postgres"
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  storage_type           = "gp2"

  db_name  = "postgres"
  username = "postgres"
  password = "postgres123" # na studia OK, w realu -> secrets

  db_subnet_group_name   = aws_db_subnet_group.postgres.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  publicly_accessible = true
  skip_final_snapshot = true
}

############################
# ALB BACKEND
############################
resource "aws_lb" "backend" {
  name               = "studia-backend-alb"
  load_balancer_type = "application"
  subnets            = data.aws_subnets.default.ids
  security_groups    = [aws_security_group.ecs.id]
}

resource "aws_lb_target_group" "backend" {
  name        = "studia-backend-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "ip"

  health_check {
    path    = "/health"
    matcher = "200-399"
  }
}

resource "aws_lb_listener" "backend" {
  load_balancer_arn = aws_lb.backend.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

############################
# ALB FRONTEND
############################
resource "aws_lb" "frontend" {
  name               = "studia-frontend-alb"
  load_balancer_type = "application"
  subnets            = data.aws_subnets.default.ids
  security_groups    = [aws_security_group.ecs.id]
}

resource "aws_lb_target_group" "frontend" {
  name        = "studia-frontend-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "ip"
}

resource "aws_lb_listener" "frontend" {
  load_balancer_arn = aws_lb.frontend.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

############################
# TASK DEFINITIONS
############################
resource "aws_ecs_task_definition" "backend" {
  family                   = "studia-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu    = 512
  memory = 1024

  execution_role_arn = aws_iam_role.ecs.arn
  task_role_arn      = aws_iam_role.ecs.arn

  container_definitions = jsonencode([{
    name  = "backend"
    image = aws_ecr_repository.backend.repository_url
    portMappings = [{ containerPort = 8000 }]

    environment = [
      { name = "DB_HOST", value = aws_db_instance.postgres.address },
      { name = "DB_NAME", value = "postgres" },
      { name = "DB_USER", value = "postgres" },
      { name = "DB_PASSWORD", value = "postgres123" },
      { name = "AWS_STORAGE_BUCKET_NAME", value = aws_s3_bucket.files.bucket },
      { name = "AWS_REGION", value = "eu-central-1" }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.ecs.name
        awslogs-region        = "eu-central-1"
        awslogs-stream-prefix = "backend"
      }
    }
  }])
}

resource "aws_ecs_task_definition" "frontend" {
  family                   = "studia-frontend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu    = 256
  memory = 512

  execution_role_arn = aws_iam_role.ecs.arn

  container_definitions = jsonencode([{
    name  = "frontend"
    image = aws_ecr_repository.frontend.repository_url
    portMappings = [{ containerPort = 80 }]

    environment = [
      { name = "VITE_API_URL", value = "http://${aws_lb.backend.dns_name}" }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.ecs.name
        awslogs-region        = "eu-central-1"
        awslogs-stream-prefix = "frontend"
      }
    }
  }])
}

############################
# ECS SERVICES
############################
resource "aws_ecs_service" "backend" {
  name            = "backend"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = data.aws_subnets.default.ids
    security_groups = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8000
  }
}

resource "aws_ecs_service" "frontend" {
  name            = "frontend"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = data.aws_subnets.default.ids
    security_groups = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 80
  }
}


#publiczny bucket

resource "aws_s3_bucket_public_access_block" "files" {
  bucket = aws_s3_bucket.files.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}
resource "aws_s3_bucket_policy" "files_public_read" {
  bucket = aws_s3_bucket.files.id

  depends_on = [
    aws_s3_bucket_public_access_block.files
  ]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.files.arn}/*"
      }
    ]
  })
}
resource "aws_s3_bucket_ownership_controls" "files" {
  bucket = aws_s3_bucket.files.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}
