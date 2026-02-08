# 打包前端项目
cd front
npm i
npm run build:prod

rm -rf ../src/main/resources/static/*
cp -r dist/* ../src/main/resources/static/

cd ..
chmod +x remote_deploy.sh
./remote_deploy.sh

## 制作镜像并推送到镜像仓库
#cd ../
#mvn package
#cp ./target/ai-coder-0.0.1-SNAPSHOT.jar ./ai-coder-0.0.1-SNAPSHOT.jar
#
# docker volume create ai-coder-log
# docker build -t ai-coder .
# docker run -it --name ai-coder -p 6001:6001 -v ai-coder-log:/log --log-driver json-file --log-opt max-size=10m -d ai-coder
#

#docker build --network=host -t lark-base-docker-registry-cn-beijing.cr.volces.com/connector/ai-coder:latest .
#docker push lark-base-docker-registry-cn-beijing.cr.volces.com/connector/ai-coder:latest
#
#kubectl -n connector rollout restart deployment/ai-coder-deployment