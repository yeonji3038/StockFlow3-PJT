resource "aws_instance" "k8s_node" {
  ami                    = "ami-0c9c942bd7bf113a2"
  instance_type          = "t3.medium"
  subnet_id              = aws_subnet.private_k8s_2a.id
  vpc_security_group_ids = ["sg-074d15e69fe27976f"]
  key_name               = "key-stockflow"

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name = "stock-flow-k8s-node"
  }
}
