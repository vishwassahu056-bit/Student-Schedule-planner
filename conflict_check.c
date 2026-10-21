
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_ROWS 10000
#define LINE_SIZE 2048

typedef struct {
    char day[32];
    char start[32];
    char end[32];
    char section[128];
    char subject[128];
    char faculty[128];
    char room[128];
    char period[16];
} TimetableRow;

void copy_field(char *dst, size_t size, const char *src) {
    if (src == NULL) {
        src = "";
    }

    strncpy(dst, src, size - 1);
    dst[size - 1] = '\0';
}

int to_minutes(const char *time) {
    int hour, minute;
    char extra;

    if (sscanf(time, "%d:%d%c", &hour, &minute, &extra) != 2) {
        return -1;
    }

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return -1;
    }

    return hour * 60 + minute;
}

int time_overlaps(const TimetableRow *a, const TimetableRow *b) {
    int startA = to_minutes(a->start);
    int endA = to_minutes(a->end);
    int startB = to_minutes(b->start);
    int endB = to_minutes(b->end);

    if (startA < 0 || endA < 0 || startB < 0 || endB < 0) {
        return 0;
    }

    if (endA <= startA || endB <= startB) {
        return 0;
    }

    return startA < endB && startB < endA;
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr,
                "Usage: conflict_check.exe <Timetable_Output.csv>\n");
        return 2;
    }

    FILE *fp = fopen(argv[1], "r");

    if (fp == NULL) {
        perror("Cannot open timetable CSV");
        return 2;
    }

    TimetableRow *rows =
        malloc(MAX_ROWS * sizeof(TimetableRow));

    if (rows == NULL) {
        fprintf(stderr, "Memory allocation failed.\n");
        fclose(fp);
        return 2;
    }

    char line[LINE_SIZE];
    int n = 0;
    int lineNumber = 0;

    if (fgets(line, sizeof(line), fp) == NULL) {
        fprintf(stderr, "Empty timetable file.\n");
        free(rows);
        fclose(fp);
        return 2;
    }

    lineNumber++;

  
    while (fgets(line, sizeof(line), fp) != NULL) {
        lineNumber++;

        if (n >= MAX_ROWS) {
            fprintf(stderr, "Maximum of %d sessions exceeded.\n",
                    MAX_ROWS);
            free(rows);
            fclose(fp);
            return 2;
        }

        char *fields[8];
        int fieldCount = 0;

        fields[fieldCount++] = strtok(line, ",\r\n");

        while (fieldCount < 8 &&
               (fields[fieldCount] = strtok(NULL, ",\r\n")) != NULL) {
            fieldCount++;
        }

        if (fieldCount != 8) {
            fprintf(stderr, "Invalid CSV row at line %d.\n",
                    lineNumber);
            free(rows);
            fclose(fp);
            return 2;
        }

        char *destinations[8] = {
            rows[n].day,
            rows[n].start,
            rows[n].end,
            rows[n].section,
            rows[n].subject,
            rows[n].faculty,
            rows[n].room,
            rows[n].period
        };

        size_t sizes[8] = {
            sizeof(rows[n].day),
            sizeof(rows[n].start),
            sizeof(rows[n].end),
            sizeof(rows[n].section),
            sizeof(rows[n].subject),
            sizeof(rows[n].faculty),
            sizeof(rows[n].room),
            sizeof(rows[n].period)
        };

        for (int k = 0; k < 8; k++) {
            if (strlen(fields[k]) >= sizes[k]) {
                fprintf(stderr,
                        "Field too long at CSV line %d.\n",
                        lineNumber);
                free(rows);
                fclose(fp);
                return 2;
            }

            copy_field(destinations[k], sizes[k], fields[k]);
        }

    
        int start = to_minutes(rows[n].start);
        int end = to_minutes(rows[n].end);

        if (start < 0 || end < 0 || end <= start) {
            fprintf(stderr, "Invalid time at CSV line %d.\n",
                    lineNumber);
            free(rows);
            fclose(fp);
            return 2;
        }

        n++;
    }

    fclose(fp);

    if (n == 0) {
        fprintf(stderr, "No timetable sessions found.\n");
        free(rows);
        return 2;
    }

    int conflicts = 0;

    
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (strcmp(rows[i].day, rows[j].day) != 0) {
                continue;
            }

            if (!time_overlaps(&rows[i], &rows[j])) {
                continue;
            }

            if (strcmp(rows[i].section, rows[j].section) == 0) {
                printf("SECTION CLASH: %s on %s, %s-%s\n",
                       rows[i].section, rows[i].day,
                       rows[i].start, rows[i].end);
                conflicts++;
            }

            if (strcmp(rows[i].faculty, rows[j].faculty) == 0) {
                printf("FACULTY CLASH: %s on %s, %s-%s\n",
                       rows[i].faculty, rows[i].day,
                       rows[i].start, rows[i].end);
                conflicts++;
            }

            if (strcmp(rows[i].room, rows[j].room) == 0) {
                printf("ROOM CLASH: %s on %s, %s-%s\n",
                       rows[i].room, rows[i].day,
                       rows[i].start, rows[i].end);
                conflicts++;
            }
        }
    }

    if (conflicts == 0) {
        printf("C DSA validation passed: %d sessions; "
               "no section, faculty or room clashes.\n", n);
        free(rows);
        return 0;
    }

    printf("Validation failed: %d clash report(s).\n", conflicts);

    free(rows);
    return 1;
}
