# Granja Pro – Database Schema

ALL CHARTS MUST BE FROM RECHARTS

## Core Tables

users
farms
barns
flocks
egg_production
feed_consumption
inventory
mortality
health_records
financial_transactions
customers
sales
tasks
alerts

## Table Descriptions

users
System users.

farms
Farm entities.

barns
Barn structure inside farms.

flocks
Groups of birds.

egg_production
Daily egg production data.

feed_consumption
Feed usage tracking.

inventory
Feed inventory tracking.

mortality
Bird mortality records.

health_records
Health records for vaccinations, treatments, and inspections. Also serves as vaccine schedule (type='vaccination' with status='scheduled'/'upcoming').

financial_transactions
Income and expenses.

customers
Egg buyers.

sales
Sales records.

tasks
Daily farm tasks.

alerts
System notifications.