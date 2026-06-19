variable "region" {
  default = "ap-northeast-2"
}

variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

variable "project" {
  default = "stockflow"
}

variable "db_username" {
  type      = string
  sensitive = true
}

variable "db_password" {
  type      = string
  sensitive = true
}
