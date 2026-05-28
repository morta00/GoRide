import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private searchTermSource = new BehaviorSubject<string>('');
  searchTerm$ = this.searchTermSource.asObservable();

  setSearchTerm(term: string): void {
    this.searchTermSource.next(term || '');
  }

  clear(): void {
    this.searchTermSource.next('');
  }

  /** Sync topbar search with a page field and optional route ?search= */
  bindPage(
    route: ActivatedRoute,
    apply: (term: string) => void
  ): Subscription {
    const sub = new Subscription();
    sub.add(
      this.searchTerm$.subscribe(term => {
        apply(term || '');
      })
    );
    sub.add(
      route.queryParams.subscribe(params => {
        const q = params['search'];
        if (q != null && String(q).trim()) {
          const term = String(q).trim();
          this.setSearchTerm(term);
          apply(term);
        }
      })
    );
    return sub;
  }
}
