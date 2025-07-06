describe('API flow', () => {
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/P+BKywAAAABJRU5ErkJggg==';
  it('register -> login -> quick action -> join', () => {
    cy.task('resetData');
    cy.task('register', { username: 'e2euser', password: 'strongpassword', image: b64 }).then((res) => {
      const { id, cookies } = res;
      expect(id).to.be.a('string');
      cy.task('login', { username: 'e2euser', password: 'strongpassword', cookies }).then((cookies2) => {
        cy.task('quick', { title: 'Flow Event', description: 'Desc', cookies: cookies2 }).then((actId) => {
          cy.task('join', { id: actId, cookies: cookies2 }).then((act) => {
            expect(act.participants).to.include(id);
          });
        });
      });
    });
  });
});
