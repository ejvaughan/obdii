.prevent_execution:
	exit 0
#This target is to ensure accidental execution of Makefile as a bash script will not execute commands like rm in unexpected directories and exit gracefully.

CC = gcc

#remove @ for no make command prints
DEBUG=@

LIBRARY_INCLUDE_DIRS = -I src -I src/libancillary
LIBRARY_SRC_FILES=src/OBDII.c src/OBDIICommunication.c src/libancillary/fd_recv.c

DAEMON_SRC_FILES = src/OBDIIDaemon.c src/libancillary/fd_send.c src/libancillary/fd_recv.c
DAEMON_INCLUDE_DIRS = -I src -I src/libancillary

APP_DIR = src
APP_INCLUDE_DIRS += -I $(APP_DIR)
APP_INCLUDE_DIRS += -I src/libancillary
APP_INCLUDE_DIRS += -I EasyArgs
APP_INCLUDE_DIRS += -I EasyArgs/uthash/include
APP_SRC_FILES=$(LIBRARY_SRC_FILES) EasyArgs/EasyArgs.c

BUILD_DIR = build

UNITY_ROOT = Unity
TESTS_INCLUDE_DIRS = $(LIBRARY_INCLUDE_DIRS) -I$(UNITY_ROOT)/src -I$(UNITY_ROOT)/extras/fixture/src
TESTS_SRC_FILES = $(LIBRARY_SRC_FILES) $(UNITY_ROOT)/src/unity.c $(UNITY_ROOT)/extras/fixture/src/unity_fixture.c tests/*.c tests/test_runners/*.c

CLI_TARGET_NAME = cli
IOT_TARGET_NAME = car_iot

#IoT client directory


IOT_CLIENT_DIR=linux_mqtt_openssl-latest/aws_iot_src

PLATFORM_DIR = $(IOT_CLIENT_DIR)/protocol/mqtt/aws_iot_embedded_client_wrapper/platform_linux/openssl
PLATFORM_COMMON_DIR = $(IOT_CLIENT_DIR)/protocol/mqtt/aws_iot_embedded_client_wrapper/platform_linux/common
SHADOW_SRC_DIR= $(IOT_CLIENT_DIR)/shadow


IOT_INCLUDE_DIRS += -I $(IOT_CLIENT_DIR)/protocol/mqtt
IOT_INCLUDE_DIRS += -I $(IOT_CLIENT_DIR)/protocol/mqtt/aws_iot_embedded_client_wrapper
IOT_INCLUDE_DIRS += -I $(IOT_CLIENT_DIR)/protocol/mqtt/aws_iot_embedded_client_wrapper/platform_linux
IOT_INCLUDE_DIRS += -I $(PLATFORM_COMMON_DIR)
IOT_INCLUDE_DIRS += -I $(PLATFORM_DIR)
IOT_INCLUDE_DIRS += -I $(SHADOW_SRC_DIR)
IOT_INCLUDE_DIRS += -I $(IOT_CLIENT_DIR)/utils
IOT_INCLUDE_DIRS += -I $(IOT_CLIENT_DIR)/shadow

IOT_SRC_FILES += $(IOT_CLIENT_DIR)/protocol/mqtt/aws_iot_embedded_client_wrapper/aws_iot_mqtt_embedded_client_wrapper.c
IOT_SRC_FILES += $(IOT_CLIENT_DIR)/utils/jsmn.c
IOT_SRC_FILES += $(IOT_CLIENT_DIR)/utils/aws_iot_json_utils.c
IOT_SRC_FILES += $(shell find $(SHADOW_SRC_DIR)/ -name '*.c')
IOT_SRC_FILES += $(shell find $(PLATFORM_DIR)/ -name '*.c')
IOT_SRC_FILES += $(shell find $(PLATFORM_COMMON_DIR)/ -name '*.c')

#MQTT Paho Embedded C client directory
MQTT_DIR = linux_mqtt_openssl-latest/aws_mqtt_embedded_client_lib
MQTT_C_DIR = $(MQTT_DIR)/MQTTClient-C/src
MQTT_EMB_DIR = $(MQTT_DIR)/MQTTPacket/src

MQTT_INCLUDE_DIR += -I $(MQTT_EMB_DIR)
MQTT_INCLUDE_DIR += -I $(MQTT_C_DIR)

MQTT_SRC_FILES += $(shell find $(MQTT_EMB_DIR)/ -name '*.c')
MQTT_SRC_FILES += $(MQTT_C_DIR)/MQTTClient.c

#TLS - openSSL
TLS_LIB_DIR = /usr/lib/
TLS_INCLUDE_DIR = -I /usr/include/openssl
EXTERNAL_LIBS += -L$(TLS_LIB_DIR)
LD_FLAG := -ldl -lssl -lcrypto
LD_FLAG += -Wl,-rpath,$(TLS_LIB_DIR)

#Aggregate all include and src directories
INCLUDE_ALL_DIRS += $(IOT_INCLUDE_DIRS) 
INCLUDE_ALL_DIRS += $(MQTT_INCLUDE_DIR) 
INCLUDE_ALL_DIRS += $(TLS_INCLUDE_DIR)
INCLUDE_ALL_DIRS += $(APP_INCLUDE_DIRS)
 
IOT_TARGET_SRC_FILES += $(MQTT_SRC_FILES)
IOT_TARGET_SRC_FILES += $(APP_SRC_FILES)
IOT_TARGET_SRC_FILES += $(IOT_SRC_FILES)

# Logging level control
LOG_FLAGS += -DIOT_DEBUG
LOG_FLAGS += -DIOT_INFO
LOG_FLAGS += -DIOT_WARN
LOG_FLAGS += -DIOT_ERROR

COMPILER_FLAGS += -g 
COMPILER_FLAGS += $(LOG_FLAGS)

CLI_TARGET_MAKE_CMD = $(CC) $(APP_DIR)/$(CLI_TARGET_NAME).c $(APP_SRC_FILES) $(COMPILER_FLAGS) -o $(BUILD_DIR)/$(CLI_TARGET_NAME) $(APP_INCLUDE_DIRS)

IOT_TARGET_MAKE_CMD = $(CC) $(APP_DIR)/$(IOT_TARGET_NAME).c $(IOT_TARGET_SRC_FILES) $(COMPILER_FLAGS) -o $(BUILD_DIR)/$(IOT_TARGET_NAME) $(EXTERNAL_LIBS) $(LD_FLAG) $(INCLUDE_ALL_DIRS)

SHARED_LIBRARY_MAKE_CMD = $(CC) $(LIBRARY_SRC_FILES) $(COMPILER_FLAGS) -fpic -shared -o $(BUILD_DIR)/libobdii.so $(LIBRARY_INCLUDE_DIRS)

.PHONY: tests

all: cli iot

cli:
	@mkdir -p $(BUILD_DIR)
	$(DEBUG)$(CLI_TARGET_MAKE_CMD)

iot:
	@mkdir -p $(BUILD_DIR)
	$(DEBUG)$(IOT_TARGET_MAKE_CMD)
	
shared:
	@mkdir -p $(BUILD_DIR)
	$(DEBUG)$(SHARED_LIBRARY_MAKE_CMD)

daemon:
	@mkdir -p $(BUILD_DIR)
	$(DEBUG)$(CC) $(COMPILER_FLAGS) $(DAEMON_SRC_FILES) $(DAEMON_INCLUDE_DIRS) -o $(BUILD_DIR)/obdiid

tests:
	@mkdir -p $(BUILD_DIR)
	$(DEBUG)$(CC) $(COMPILER_FLAGS) $(TESTS_SRC_FILES) $(TESTS_INCLUDE_DIRS) -o $(BUILD_DIR)/tests
	- $(BUILD_DIR)/tests -v
	
clean:
	rm -f $(BUILD_DIR)/*
