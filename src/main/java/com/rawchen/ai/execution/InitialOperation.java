package com.rawchen.ai.execution;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Spring Boot启动后自动执行
 *
 * @author RawChen
 * @since 2023-03-07 15:50
 */
@Component
@Order(1)
@Slf4j
public class InitialOperation implements CommandLineRunner {

	@Override
	public void run(String... args) throws Exception {
		log.info("初始化动作");
	}
}
