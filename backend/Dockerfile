FROM maven:3.9-eclipse-temurin-25-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
COPY --from=build /app/target/fueld-backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
# RAM-Budget für Railway: Heap 256m + Metaspace 128m + Code-Cache 64m + Stacks/native
# → RSS landet bei ~280-320 MB. SerialGC hat den kleinsten Overhead bei kleinem Heap,
# TieredStopAtLevel=1 schaltet den speicherhungrigen C2-JIT ab (bei dieser Last unkritisch).
ENTRYPOINT ["java", \
  "-Xmx256m", \
  "-XX:MaxMetaspaceSize=128m", \
  "-XX:ReservedCodeCacheSize=64m", \
  "-XX:+UseSerialGC", \
  "-XX:TieredStopAtLevel=1", \
  "-Xss512k", \
  "-Dspring.profiles.active=prod", \
  "-jar", "app.jar"]
