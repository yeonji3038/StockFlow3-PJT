output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_2a" {
  value = aws_subnet.public_2a.id
}

output "public_subnet_2c" {
  value = aws_subnet.public_2c.id
}

output "private_k8s_subnet_2a" {
  value = aws_subnet.private_k8s_2a.id
}

output "private_k8s_subnet_2c" {
  value = aws_subnet.private_k8s_2c.id
}

output "private_rds_subnet_2a" {
  value = aws_subnet.private_rds_2a.id
}

output "private_rds_subnet_2c" {
  value = aws_subnet.private_rds_2c.id
}

output "k8s_security_group_id" {
  value = aws_security_group.k8s.id
}

output "rds_security_group_id" {
  value = aws_security_group.rds.id
}

output "nat_instance_id" {
  value = aws_instance.nat.id
}

output "rds_endpoint" {
  value = aws_db_instance.main.endpoint
}
