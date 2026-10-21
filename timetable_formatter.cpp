#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <set>
#include <map>
#include <filesystem>
#include <algorithm>
using namespace std;
namespace fs = std::filesystem;

struct Entry { string day,start,end,section,subject,faculty,room,period; };

string trim(string s) {
    while(!s.empty() && (s.back()=='\r' || s.back()==' ')) s.pop_back();
    size_t p=s.find_first_not_of(' ');
    return p==string::npos ? "" : s.substr(p);
}
vector<string> parseCSV(const string& line) {
    vector<string> cells; string cell; bool quoted=false;
    for(size_t i=0;i<line.size();++i) {
        char c=line[i];
        if(c=='"') {
            if(quoted && i+1<line.size() && line[i+1]=='"') { cell+='"'; ++i; }
            else quoted=!quoted;
        } else if(c==',' && !quoted) { cells.push_back(trim(cell)); cell.clear(); }
        else cell+=c;
    }
    cells.push_back(trim(cell));
    return cells;
}
string esc(const string& s) {
    string o;
    for(char c:s) { if(c=='&') o+="&amp;"; else if(c=='<') o+="&lt;"; else if(c=='>') o+="&gt;"; else if(c=='"') o+="&quot;"; else o+=c; }
    return o;
}
string safeName(string s) {
    for(char& c:s) if(!(isalnum((unsigned char)c)||c=='-'||c=='_')) c='_';
    return s;
}
vector<Entry> readRows(const string& path) {
    ifstream in(path); if(!in) throw runtime_error("Cannot open input CSV: "+path);
    string line; if(!getline(in,line)) throw runtime_error("Input CSV is empty.");
    vector<Entry> rows;
    while(getline(in,line)) {
        if(trim(line).empty()) continue;
        auto c=parseCSV(line);
        if(c.size()<8) continue;
        rows.push_back({c[0],c[1],c[2],c[3],c[4],c[5],c[6],c[7]});
    }
    return rows;
}
int main(int argc,char**argv) {
    if(argc<3) {
        cerr<<"Usage: timetable_formatter <Timetable_Output.csv> <output_folder> [section] [academic_year] [effective_date]\n";
        return 2;
    }
    try {
        auto rows=readRows(argv[1]); fs::path out=argv[2]; fs::create_directories(out);
        string sectionArg=argc>3?argv[3]:"";
        string year=argc>4?argv[4]:"2026-27";
        string effective=argc>5?argv[5]:"13 July 2026";
        set<string> sections, timeSet;
        map<string,string> endAt;
        for(auto&r:rows) { sections.insert(r.section); timeSet.insert(r.start); endAt[r.start]=r.end; }
        vector<string> days={"Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"};
        vector<string> times(timeSet.begin(),timeSet.end());
        for(const string& sec:sections) {
            if(!sectionArg.empty() && sec!=sectionArg) continue;
            ofstream h(out/(safeName(sec)+"_College_Timetable.html"));
            h<<"<!doctype html><html><head><meta charset=\"utf-8\"><title>College Timetable</title><style>"
             <<"@page{size:A3 landscape;margin:10mm}body{font-family:'Times New Roman',serif;color:#000;background:#fff;margin:16px}"
             <<"h2,h3,p{text-align:center;margin:3px}table{border-collapse:collapse;width:100%;table-layout:fixed;margin-top:10px}"
             <<"th,td{border:1px solid #000;text-align:center;vertical-align:middle;padding:5px;overflow-wrap:anywhere;font-size:13px}"
             <<"th{font-weight:bold}th.day,td.day{width:6%;font-weight:bold}thead th{height:42px}tbody td{height:72px}"
             <<".title{font-size:18px;font-weight:bold}.sub{font-size:16px;font-weight:bold}"
             <<"@media print{body{margin:0}table{page-break-inside:avoid}}</style></head><body>";
            h<<"<h2 class=\"title\">TIME TABLE OF B.TECH. III SEMESTER – COMPUTER SCIENCE &amp; ENGINEERING (Section: "<<esc(sec)<<")</h2>"
             <<"<h3>ACADEMIC YEAR "<<esc(year)<<"</h3><p class=\"sub\">W.E.F: "<<esc(effective)<<"</p>";
            h<<"<table><thead><tr><th class=\"day\"></th>";
            for(auto&t:times) h<<"<th>"<<esc(t)<<"–"<<esc(endAt[t])<<"</th>";
            h<<"</tr></thead><tbody>";
            for(auto&day:days) {
                h<<"<tr><td class=\"day\">"<<esc(day.substr(0,3))<<"</td>";
                for(auto&t:times) {
                    string cell="";
                    for(const auto&r:rows) if(r.section==sec && r.day==day && r.start==t) {
                        cell=r.subject;
                        if(!r.faculty.empty()) cell+="\\n"+r.faculty;
                        if(!r.room.empty()) cell+="\\n"+r.room;
                        break;
                    }
                    h<<"<td>";
                    if(cell.empty()) h<<"&nbsp;";
                    else {
                        string temp;
                        for(char c:cell) { if(c=='\n') h<<"<br>"; else h<<esc(string(1,c)); }
                    }
                    h<<"</td>";
                }
                h<<"</tr>";
            }
            h<<"</tbody></table><p style=\"margin-top:8px;font-size:11px\">Generated from timetable assignments. Review blank slots and scheduling constraints before publishing.</p></body></html>";
        }
        cout<<"Created black-and-white HTML timetable(s) for "<<(sectionArg.empty()?sections.size():1)<<" section(s).\n";
        cout<<"Open the .html file in a browser; use Print to save as PDF. HTML is used because standard C++ cannot create styled XLSX files by itself.\n";
    } catch(const exception&e) { cerr<<"ERROR: "<<e.what()<<"\n"; return 1; }
}
