#include "configuration.h"
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include "uthash.h"
#include <errno.h>

typedef struct CommandLineArg {
	char *option;
	char *arg;
	UT_hash_handle hh; /* make struct hashable */
} CommandLineArg;

static void FreeCommandLineArg(CommandLineArg *arg)
{
	if (arg == NULL) {
		return;
	}

	if (arg->option != NULL) {
		free(arg->option);
	}

	if (arg->arg != NULL) {
		free(arg->arg);
	}

	free(arg);
}

static void AddArgsFromConfigFile(CommandLineArg **parsedArgs, const char *configFile) {
	if (!parsedArgs || !configFile) {
		return;
	}

	FILE *f = fopen(configFile, "r");
	if (!f) {
		return;
	}
	
	char *line = NULL;
	size_t length = 0;
	while (getline(&line, &length, f) != -1) {
		char *option = NULL, *arg = NULL;

		if (sscanf(line, "%ms %ms", &option, &arg) >= 1) {
			CommandLineArg *parsedArg = malloc(sizeof(CommandLineArg));
			if (parsedArg) {
				parsedArg->option = option;
				parsedArg->arg = arg;
				
				CommandLineArg *existing = NULL;
				HASH_FIND_STR(*parsedArgs, option, existing);
				if (!existing) {
					HASH_ADD_KEYPTR(hh, *parsedArgs, option, strlen(option), parsedArg);
				}
			}
		}
	}
	
	free(line);
}

void FreeCommandLineArgTemplateResources(CommandLineArgTemplate *templates[], int templatesCount)
{
	int i;
	for (i = 0; i < templatesCount; ++i) {
		if (templates[i]->value) {
			free(templates[i]->value);
		}
	}
}

int ParseCommandLineArgs(int argc, char *argv[], CommandLineArgTemplate *templates[], int templatesCount, char *configFileOptionName, char *defaultConfigFile)
{
	CommandLineArg *parsedArgs = NULL;
	
	int i;
	for (i = 1; i < argc; ++i) {
		if (argv[i][0] == '-') {
			// This arg is an option
			const char *optionName = (argv[i][1] == '-') ? argv[i] + 2 : argv[i] + 1;
			CommandLineArg *parsedArg = malloc(sizeof(CommandLineArg));
			if (parsedArg == NULL) {
				return i; // Bail
			}
			parsedArg->option = strdup(optionName);
			parsedArg->arg = NULL;

			// Parse the option's argument, if there is one
			if (i < argc - 1) {
				if (argv[i + 1][0] != '-') {
					parsedArg->arg = strdup(argv[i + 1]);
					i += 1;
				}
			}	

			CommandLineArg *replacing = NULL;
			HASH_REPLACE_STR(parsedArgs, option, parsedArg, replacing);
			if (replacing) {
				FreeCommandLineArg(replacing);
			}
		} else {
			// Stop parsing command line args
			break;
		}
	}

	int userSuppliedConfigFile = 0;
	// Read in arguments from config file, if necessary
	if (configFileOptionName) {
		CommandLineArg *configFileArg = NULL;
		HASH_FIND_STR(parsedArgs, configFileOptionName, configFileArg);
		if (configFileArg && configFileArg->arg != NULL) {
			userSuppliedConfigFile = 1;
			AddArgsFromConfigFile(&parsedArgs, configFileArg->arg);	
		}
	}

	if (!userSuppliedConfigFile && defaultConfigFile != NULL) {
		AddArgsFromConfigFile(&parsedArgs, defaultConfigFile);
	}	

	if (templates) {
		int i;
		for (i = 0; i < templatesCount; ++i) {
			CommandLineArgTemplate *template = templates[i];
			CommandLineArg *found = NULL;
			HASH_FIND_STR(parsedArgs, template->name, found);
			if (!found && template->longName) {
				HASH_FIND_STR(parsedArgs, template->longName, found);
			}

			if (found) {
				template->present = 1;
				
				if (template->takesArg) {
					if (found->arg) {
						template->value = found->arg;
						found->arg = NULL;
					} else {
						printf("%s option takes an argument.\n", template->name);
						exit(EXIT_FAILURE);
					}
				}
			} else {
				if (template->required) {
					printf("%s option required.\n", template->name);
					exit(EXIT_FAILURE);
				}
			}
		}
	}

	// Clean up
	CommandLineArg *arg, *tmp;
	HASH_ITER(hh, parsedArgs, arg, tmp) {
		HASH_DEL(parsedArgs, arg);
		FreeCommandLineArg(arg);
	}

	return i;
}

