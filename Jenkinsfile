pipeline {
    agent any
    tools {
        nodejs 'Node'
        dockerTool 'Docker'
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Install') {
            steps {
                sh 'npm install'
            }
        }
        stage('build') {
            steps {
                sh 'npm run build'
            }
        }
        stage('Ensure Docker Running') {
            steps {
                sh '''
                if ! systemctl is-active --quiet docker; then
                  echo "Starting Docker..."
                  sudo systemctl start docker
                else
                  echo "Docker is already running."
                fi
                '''
            }
        }
        stage('Build Docker Image') {
            steps {
                sh 'docker build -t familytree .'
            }
        }
    }
}