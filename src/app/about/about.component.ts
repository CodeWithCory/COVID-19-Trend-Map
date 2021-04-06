import { Component, OnInit } from '@angular/core';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import { HttpClient } from '@angular/common/http';
import { ViewportScroller } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit {

  /* Font Awesome */
  faLink = faLink;

  constructor(private http: HttpClient, private viewportScroller: ViewportScroller, private route: ActivatedRoute) {
  }

  ngOnInit(): void {

    /* Note page view */
    const url = '/api/note/page';
    const body = { label: 'about' };
    const viewStatusReportObservable = this.http.post(url, body).subscribe((res: any) => {
      viewStatusReportObservable.unsubscribe();
    });

    /* Scroll once all images have loaded */
    const images = document.querySelectorAll('img');
    let counter = 0;

    for (let i = 0; i < images.length; i++) {
      images[i].addEventListener('load', () => {
        counter++;
        if (counter === images.length) {
          /* Scroll to fragment */
          const fragmentObservable = this.route.fragment.subscribe((fragment: string) => {
            if (fragment && fragment.length > 0) {
              setTimeout(() => {
                this.scrollToFragment(fragment);
                fragmentObservable.unsubscribe();
              }, 250);
            }
          });
        }
      }, false);
    }


  }

  scrollToFragment(id) {
    this.viewportScroller.scrollToAnchor(id);
  }

}
