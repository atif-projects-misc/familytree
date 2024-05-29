pipeline {
    agent any
    tools {
        nodejs 'Node'
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
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