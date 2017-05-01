.prevent_execution:
	exit 0
#This target is to ensure accidental execution of Makefile as a bash script will not execute commands like rm in unexpected directories and exit gracefully.

CC = gcc

#remove @ for no make command prints
DEBUG=@

LIBRARY_INCLUDE_DIRS = -I src
LIBRARY_SRC_FILES=src/OBDII.c src/OBDIICommunication.c

DAEMON_SRC_FILES = src/OBDIIDaemon.c
DAEMON_INCLUDE_DIRS = -I src

CLI_DIR = src
CLI_INCLUDE_DIRS += -I $(CLI_DIR)
CLI_SRC_FILES=$(LIBRARY_SRC_FILES)

BUILD_DIR = build

UNITY_ROOT = Unity
TESTS_INCLUDE_DIRS = $(LIBRARY_INCLUDE_DIRS) -I$(UNITY_ROOT)/src -I$(UNITY_ROOT)/extras/fixture/src
TESTS_SRC_FILES = $(LIBRARY_SRC_FILES) $(UNITY_ROOT)/src/unity.c $(UNITY_ROOT)/extras/fixture/src/unity_fixture.c tests/*.c tests/test_runners/*.c

CLI_TARGET_NAME = cli

COMPILER_FLAGS += -g 

CLI_TARGET_MAKE_CMD = $(CC) $(CLI_DIR)/$(CLI_TARGET_NAME).c $(CLI_SRC_FILES) $(COMPILER_FLAGS) -o $(BUILD_DIR)/$(CLI_TARGET_NAME) $(CLI_INCLUDE_DIRS)

SHARED_LIBRARY_MAKE_CMD = $(CC) $(LIBRARY_SRC_FILES) $(COMPILER_FLAGS) -fpic -shared -o $(BUILD_DIR)/libobdii.so $(LIBRARY_INCLUDE_DIRS)

.PHONY: tests

all: cli shared daemon

cli:
	@mkdir -p $(BUILD_DIR)
	$(DEBUG)$(CLI_TARGET_MAKE_CMD)

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
