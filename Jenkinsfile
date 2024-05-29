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
        stage('Build Docker Image') {
            steps {
                sh 'docker context ls'
                sh 'docker context use default'
                sh 'docker build -t familytree .'
            }
        }
    }
}