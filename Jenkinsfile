pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Install') {
            steps {
                sh 'sudo apt install npm'
            }
        }
        stage('build') {
            steps {
                sh 'npm run build'
            }
        }
        stage('Build Docker Image') {
            steps {
                sh 'docker build -t familytree .'
            }
        }
    }
}