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
                sh 'docker build -t familytree:1.0 .'
            }
        }
        stage('Docker Push') {
            steps {
                sh "docker tag familytree:1.0 atifhaque01/familytree:1.0"
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials-id', passwordVariable: 'DOCKERHUB_PASSWORD', usernameVariable: 'DOCKERHUB_USERNAME')]) {
                    sh "docker login -u $DOCKERHUB_USERNAME -p $DOCKERHUB_PASSWORD"
                }
                sh "docker push atifhaque01/familytree:1.0"
                sh "docker logout"
            }
        }
    }
}