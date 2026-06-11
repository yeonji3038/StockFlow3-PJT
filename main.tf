provider "aws" {
  region = var.region
}

# ── VPC ──
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project}-vpc"
  }
}

# ── Internet Gateway ──
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project}-igw"
  }
}

# ── Public Subnets ──
resource "aws_subnet" "public_2a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.0.0/24"
  availability_zone       = "ap-northeast-2a"
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project}-public-2a"
  }
}

resource "aws_subnet" "public_2c" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.10.0/24"
  availability_zone       = "ap-northeast-2c"
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project}-public-2c"
  }
}

# ── Private Subnets (K8s) ──
resource "aws_subnet" "private_k8s_2a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "ap-northeast-2a"

  tags = {
    Name = "${var.project}-private-k8s-2a"
  }
}

resource "aws_subnet" "private_k8s_2c" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "ap-northeast-2c"

  tags = {
    Name = "${var.project}-private-k8s-2c"
  }
}

# ── Private Subnets (RDS) ──
resource "aws_subnet" "private_rds_2a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "ap-northeast-2a"

  tags = {
    Name = "${var.project}-private-rds-2a"
  }
}

resource "aws_subnet" "private_rds_2c" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.12.0/24"
  availability_zone = "ap-northeast-2c"

  tags = {
    Name = "${var.project}-private-rds-2c"
  }
}

# ── Public 라우팅 테이블 ──
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "${var.project}-public-rt"
  }
}

resource "aws_route_table_association" "public_2a" {
  subnet_id      = aws_subnet.public_2a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2c" {
  subnet_id      = aws_subnet.public_2c.id
  route_table_id = aws_route_table.public.id
}

# ── Private 라우팅 테이블 (NAT Instance 연결은 nat.tf에서) ──
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project}-private-rt"
  }
}

resource "aws_route_table_association" "private_k8s_2a" {
  subnet_id      = aws_subnet.private_k8s_2a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_k8s_2c" {
  subnet_id      = aws_subnet.private_k8s_2c.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_rds_2a" {
  subnet_id      = aws_subnet.private_rds_2a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_rds_2c" {
  subnet_id      = aws_subnet.private_rds_2c.id
  route_table_id = aws_route_table.private.id
}
