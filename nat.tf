resource "aws_security_group" "nat" {
  name        = "${var.project}-nat-sg"
  description = "NAT Instance Security Group"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["10.0.0.0/16"]
    description = "Allow all traffic from private subnet"
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow SSH"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project}-nat-sg"
  }
}

resource "aws_instance" "nat" {
  ami                         = "ami-0765f9741eedf9c7b"
  instance_type               = "t3.micro"
  subnet_id                   = aws_subnet.public_2a.id
  vpc_security_group_ids      = [aws_security_group.nat.id]
  associate_public_ip_address = true
  source_dest_check           = false
  key_name                    = "key-stockflow"

  user_data = <<-SCRIPT
    #!/bin/bash
    echo 1 > /proc/sys/net/ipv4/ip_forward
    echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
    iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
    yum install -y iptables-services
    service iptables save
  SCRIPT

  tags = {
    Name = "${var.project}-nat-instance"
  }
}

resource "aws_route" "private_nat" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  network_interface_id   = aws_instance.nat.primary_network_interface_id
}
