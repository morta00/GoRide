import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-admin-placeholder',
  templateUrl: './placeholder.component.html',
  styleUrls: ['./placeholder.component.css']
})
export class PlaceholderComponent implements OnInit {
  title: string = 'Page en construction';
  icon: string = 'ion-ios-construct';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      if (data['title']) {
        this.title = data['title'];
      }
      if (data['icon']) {
        this.icon = data['icon'];
      }
    });
  }
}
