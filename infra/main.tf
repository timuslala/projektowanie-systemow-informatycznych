terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "eu-central-1"
}

##CLOUDWATCH LOG GROUP
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/studia"
  retention_in_days = 7
}





############################
# DEFAULT VPC + SUBNETY (AUTO)
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
resource "aws_ecr_repository" "backend"  {
   name = "studia-backend" 
      force_delete = true
   }
resource "aws_ecr_repository" "frontend" {
   name = "studia-frontend" 
      force_delete = true
   }
resource "aws_ecr_repository" "postgres" {
   name = "studia-postgres" 
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

resource "aws_iam_role_policy" "ecs" {
  role = aws_iam_role.ecs.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:*", "logs:*"]
      Resource = "*"
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
resource "aws_s3_bucket" "files" {
  bucket = "studia-files-${random_id.rand.hex}"
}

resource "random_id" "rand" {
  byte_length = 4
}

############################
# SECURITY GROUP (JEDEN NA WSZYSTKO)
############################
resource "aws_security_group" "all" {
  name   = "studia-all"
  vpc_id = data.aws_vpc.default.id

  ingress { 
    from_port = 0
    to_port = 65535
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress  {
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

############################
# ALB BACKEND
############################
resource "aws_lb" "backend" {
  name               = "studia-backend-alb"
  load_balancer_type = "application"
  subnets            = data.aws_subnets.default.ids
  security_groups    = [aws_security_group.all.id]
}

resource "aws_lb_target_group" "backend" {
  name        = "studia-backend-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "ip"

  health_check {
    path                = "/health"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 5
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
  security_groups    = [aws_security_group.all.id]
}

resource "aws_lb_target_group" "frontend" {
  name        = "studia-frontend-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "ip"

  health_check {
    path                = "/"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 5
  }
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
resource "aws_ecs_task_definition" "postgres" {
  family                   = "studia-postgres"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu    = 512
  memory = 1024
  execution_role_arn = aws_iam_role.ecs.arn
  task_role_arn      = aws_iam_role.ecs.arn
  volume {
    name = "postgres-data"

    efs_volume_configuration {
      file_system_id = aws_efs_file_system.postgres.id
      transit_encryption = "ENABLED"
    }
  }

  container_definitions = jsonencode([{
    name  = "postgres"
    image = "postgres:15-alpine"
    portMappings = [{ containerPort = 5432 }]
    environment = [
      { name = "POSTGRES_DB", value = "postgres" },
      { name = "POSTGRES_USER", value = "postgres" },
      { name = "POSTGRES_PASSWORD", value = "postgres" }
      ]
      mountPoints = [{
        sourceVolume  = "postgres-data"
        containerPath = "/var/lib/postgresql/data"
        readOnly      = false
      }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.ecs.name
        awslogs-region        = "eu-central-1"
        awslogs-stream-prefix = "postgres"
      }
    }

  }])
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "studia-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu    = 512
  memory = 1024
  execution_role_arn = aws_iam_role.ecs.arn
  task_role_arn      = aws_iam_role.ecs.arn

  container_definitions = jsonencode([{
    name  = "backend"
    image = aws_ecr_repository.backend.repository_url
    portMappings = [{ containerPort = 8000 }]
    environment = [
      { name = "DB_HOST", value = aws_lb.postgres.dns_name },
      { name = "DB_NAME", value = "postgres" },
      { name = "DB_USER", value = "postgres" },
      { name = "DB_PASSWORD", value = "postgres" },
      { name = "AWS_STORAGE_BUCKET_NAME", value = aws_s3_bucket.files.bucket },
      { name = "AWS_REGION", value = "eu-central-1" },
      { name = "PRODUCTION", value = "False" }
    ],
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.ecs.name
        awslogs-region        = "eu-central-1"
        awslogs-stream-prefix = "postgres"
      }
    }
  }])
}

resource "aws_ecs_task_definition" "frontend" {
  family                   = "studia-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu    = 256
  memory = 512
  execution_role_arn = aws_iam_role.ecs.arn

  container_definitions = jsonencode([{
    name  = "frontend"
    image = aws_ecr_repository.frontend.repository_url
    portMappings = [{ containerPort = 80 }]
    environment = [
      { name = "VITE_API_URL", value = "http://${aws_lb.backend.dns_name}" }
    ],
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.ecs.name
        awslogs-region        = "eu-central-1"
        awslogs-stream-prefix = "postgres"
      }
    }
  }])
}

############################
# SERVICES
############################
############################
# POSTGRES NLB
############################

# Security Group dla Postgresa (ECS task)
resource "aws_security_group" "postgres_sg" {
  name        = "postgres-sg"
  description = "Allow Postgres access from NLB"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "Allow Postgres from NLB"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.postgres_nlb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Security Group dla NLB
resource "aws_security_group" "postgres_nlb" {
  name        = "postgres-nlb-sg"
  description = "Allow TCP from backend"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    cidr_blocks     = ["0.0.0.0/0"]  # na studia, w prod ogranicz do backend
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Network Load Balancer
resource "aws_lb" "postgres" {
  name               = "postgres-nlb"
  load_balancer_type = "network"
  subnets            = data.aws_subnets.default.ids
  enable_deletion_protection = false
}

# Target Group
resource "aws_lb_target_group" "postgres" {
  name        = "postgres-tg"
  port        = 5432
  protocol    = "TCP"
  target_type = "ip"
  vpc_id      = data.aws_vpc.default.id

  health_check {
    protocol            = "TCP"
    port                = 5432
    healthy_threshold   = 2
    unhealthy_threshold = 2
    interval            = 30
    timeout             = 10
  }
}

# Listener
resource "aws_lb_listener" "postgres" {
  load_balancer_arn = aws_lb.postgres.arn
  port              = 5432
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.postgres.arn
  }
}

# ECS Service
resource "aws_ecs_service" "postgres" {
  name            = "postgres"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.postgres.arn
  launch_type     = "FARGATE"
  desired_count   = 1
    # Scaling limits: max 1 instance, min 0, desired 1
  deployment_maximum_percent         = 100
  deployment_minimum_healthy_percent = 0
  network_configuration {
    subnets         = data.aws_subnets.default.ids
    security_groups = [aws_security_group.postgres_sg.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.postgres.arn
    container_name   = "postgres"
    container_port   = 5432
  }

  depends_on = [aws_lb_listener.postgres]
}


resource "aws_ecs_service" "backend" {
  name            = "backend"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = data.aws_subnets.default.ids
    security_groups = [aws_security_group.all.id]
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
    security_groups = [aws_security_group.all.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 80
  }
}

############################
# AUTOSCALING
############################
resource "aws_appautoscaling_target" "backend" {
  min_capacity = 2
  max_capacity = 10
  resource_id  = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_target" "frontend" {
  min_capacity = 2
  max_capacity = 5
  resource_id  = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.frontend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "backend_cpu" {
  name = "backend-cpu"
  policy_type = "TargetTrackingScaling"
  resource_id = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 60
  }
}

resource "aws_appautoscaling_policy" "frontend_cpu" {
  name = "frontend-cpu"
  policy_type = "TargetTrackingScaling"
  resource_id = aws_appautoscaling_target.frontend.resource_id
  scalable_dimension = aws_appautoscaling_target.frontend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.frontend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 60
  }
}


##postgres efs

resource "aws_efs_file_system" "postgres" {
  creation_token = "studia-postgres"
}
resource "aws_efs_mount_target" "postgres" {
  for_each       = toset(data.aws_subnets.default.ids)
  file_system_id = aws_efs_file_system.postgres.id
  subnet_id      = each.value
  security_groups = [aws_security_group.all.id]
}
