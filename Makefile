SHELL := /bin/bash
.PHONY: help setup demo test benchmark health reset lab-sql lab-partitions lab-dwh lab-mapreduce lab-pagerank lab-tfidf lab-tfidf-sql
LABS := 01-relational-sql 02-partitioning-replication 03-dwh-etl 04-mapreduce 05-pagerank 06-tfidf
LAB ?= 01-relational-sql

help:
	@echo "ONE-COMMAND LAB START (from repo root):"
	@echo "  make lab-sql        SQL queries / window functions"
	@echo "  make lab-partitions Primary / Replica + sales data"
	@echo "  make lab-dwh        Staging and dimensional warehouse"
	@echo "  make lab-mapreduce  Python MapReduce"
	@echo "  make lab-pagerank   Python PageRank"
	@echo "  make lab-tfidf      Python TF-IDF (no Docker)"
	@echo "  make lab-tfidf-sql  PostgreSQL for the full TF-IDF assignment"
	@echo "Advanced: make setup|demo|test|benchmark|health|reset LAB=<lab-name>"

lab-sql:
	@bash scripts/student-init.sh 01-relational-sql
lab-partitions:
	@bash scripts/student-init.sh 02-partitioning-replication
lab-dwh:
	@bash scripts/student-init.sh 03-dwh-etl
lab-mapreduce:
	@bash scripts/student-init.sh 04-mapreduce
lab-pagerank:
	@bash scripts/student-init.sh 05-pagerank
lab-tfidf:
	@bash scripts/student-init.sh 06-tfidf
lab-tfidf-sql:
	@bash scripts/student-init.sh 06-tfidf-sql

setup demo test benchmark health reset:
	@case " $(LABS) " in *" $(LAB) "*) ;; *) echo "Unknown LAB=$(LAB)"; exit 2;; esac
	@bash scripts/lab.sh "$(LAB)" "$@"
