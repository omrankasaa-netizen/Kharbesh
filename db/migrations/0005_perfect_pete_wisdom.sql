CREATE TABLE `email_otps` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`codeHash` varchar(128) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`consumedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_otps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `email_otps_email_idx` ON `email_otps` (`email`);