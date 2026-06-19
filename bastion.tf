resource "aws_instance" "bastion" {
  ami                         = "ami-0c9c942bd7bf113a2"
  instance_type               = "t3.micro"
  subnet_id                   = aws_subnet.public_2a.id
  vpc_security_group_ids      = [aws_security_group.bastion_sg.id]
  key_name                    = "key-stockflow"
  associate_public_ip_address = true

  tags = {
    Name = "stock-flow-bastion"
  }
}

resource "aws_security_group" "bastion_sg" {
  name   = "bastion-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "bastion-sg"
  }
}
