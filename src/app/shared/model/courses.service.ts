
import {combineLatest as observableCombineLatest} from 'rxjs';

import {mergeMap, filter, map, switchMap, tap} from 'rxjs/operators';
import {Injectable} from '@angular/core';
import {AngularFireDatabase} from "angularfire2/database";
import {Observable} from "rxjs/Rx";
import {Course} from "./course";
import {Lesson} from "./lesson";
import {FirebaseListFactoryOpts} from "angularfire2/interfaces";

@Injectable()
export class CoursesService {


    constructor(private db:AngularFireDatabase) {
    }

    findAllCourses():Observable<Course[]> {
        return this.db.list('courses').pipe(map(Course.fromJsonArray));
    }


    findCourseByUrl(courseUrl:string): Observable<Course> {
        return this.db.list('courses', {
            query: {
                orderByChild: 'url',
                equalTo: courseUrl
            }
        }).pipe(
        map(results => results[0]));
    }


    findLessonKeysPerCourseUrl(courseUrl:string,
                               query: FirebaseListFactoryOpts = {}): Observable<string[]> {
        return this.findCourseByUrl(courseUrl).pipe(
            tap(val => console.log("course",val)),
            filter(course => !!course),
            switchMap(course => this.db.list(`lessonsPerCourse/${course.$key}`,query)),
            map( lspc => lspc.map(lpc => lpc.$key) ),);
    }


    findLessonsForLessonKeys(lessonKeys$: Observable<string[]>) :Observable<Lesson[]> {
        return lessonKeys$.pipe(
            map(lspc => lspc.map(lessonKey => this.db.object('lessons/' + lessonKey)) ),
            mergeMap(fbojs => observableCombineLatest(fbojs) ),)

    }


    findAllLessonsForCourse(courseUrl:string):Observable<Lesson[]> {
        return this.findLessonsForLessonKeys(this.findLessonKeysPerCourseUrl(courseUrl));
    }


    loadFirstLessonsPage(courseUrl:string, pageSize:number): Observable<Lesson[]> {

        const firstPageLessonKeys$ = this.findLessonKeysPerCourseUrl(courseUrl,
            {
                query: {
                    limitToFirst:pageSize
                }
            });

        return this.findLessonsForLessonKeys(firstPageLessonKeys$);
    }




    loadNextPage(courseUrl:string,
                 lessonKey:string, pageSize:number): Observable<Lesson[]> {

        const lessonKeys$ = this.findLessonKeysPerCourseUrl(courseUrl,
            {
                query: {
                    orderByKey: true,
                    startAt: lessonKey,
                    limitToFirst:pageSize + 1
                }
            });

        return this.findLessonsForLessonKeys(lessonKeys$).pipe(
            map(lessons => lessons.slice(1, lessons.length)));


    }

    loadPreviousPage(courseUrl:string,
                     lessonKey:string, pageSize:number): Observable<Lesson[]> {


        const lessonKeys$ = this.findLessonKeysPerCourseUrl(courseUrl,
            {
                query: {
                    orderByKey: true,
                    endAt: lessonKey,
                    limitToLast:pageSize + 1
                }
            });

        return this.findLessonsForLessonKeys(lessonKeys$).pipe(
            map(lessons => lessons.slice(0, lessons.length - 1)));

    }


}
