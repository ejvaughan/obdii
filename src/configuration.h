#ifndef __CONFIGURATION_H
#define __CONFIGURATION_H
#include "uthash.h"

typedef struct CommandLineArgTemplate {
	char *description;
	char *name;
	char *longName;
	int required;
	int takesArg;
	int present;
	char *value; // Filled in by ParseCommandLineArgs
} CommandLineArgTemplate;

#define CreateArgTemplate(name, longName, required, takesArg, description) \
{ description, name, longName, required, takesArg, 0, NULL }

void FreeCommandLineArgTemplateResources(CommandLineArgTemplate *template);

int ParseCommandLineArgs(int argc, char *argv[], CommandLineArgTemplate *templates[], int templatesCount, char *configFileOptionName, char *defaultConfigFile);

#endif /* configuration.h */
