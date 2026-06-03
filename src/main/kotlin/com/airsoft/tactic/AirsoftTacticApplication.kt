package com.airsoft.tactic

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication
import org.springframework.data.jpa.repository.config.EnableJpaRepositories

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableJpaRepositories(basePackages = ["com.airsoft.tactic.repository"])
class AirsoftTacticApplication

fun main(args: Array<String>) {
    runApplication<AirsoftTacticApplication>(*args)
}
