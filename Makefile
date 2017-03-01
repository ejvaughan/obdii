IDIR=src
ODIR=build
CC=gcc
CFLAGS=-I can-isotp-modules/include/ -I $(IDIR)

_DEPS = OBDII.h OBDIICommunication.h
DEPS = $(patsubst %,$(IDIR)/%,$(_DEPS))

_OBJ = test.o OBDII.o OBDIICommunication.o
OBJ = $(patsubst %,$(ODIR)/%,$(_OBJ))


$(ODIR)/%.o: src/%.c $(DEPS)
	@mkdir -p $(@D)
	@$(CC) -c -o $@ $< $(CFLAGS)

$(ODIR)/test: $(OBJ)
	$(CC) -o $@ $^ $(CFLAGS)

.PHONY: clean

clean:
	rm -f $(ODIR)/*.o *~ core $(INCDIR)/*~
