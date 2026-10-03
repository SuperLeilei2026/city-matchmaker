import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createAppServer} from '../serve.mjs';

test('web server exposes only public app files, never native profiles or source review packets',async()=>{
  const server=createAppServer().listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}`;
  try {
    const home=await fetch(base+'/');assert.equal(home.status,200);assert((await home.text()).includes('毕业第一站'));
    assert.equal((await fetch(base+'/data/cities.json')).status,200);
    for(const path of ['/tools/local-state/leilei-city-matchmaker/match.json','/tools/review.json','/.env','/.git/config','/README.md','/web/%2e%2e/tools/local-state/leilei-city-matchmaker/match.json']){
      assert.equal((await fetch(base+path)).status,404,path);
    }
    assert.equal((await fetch(base+'/',{method:'POST',body:'profile=private'})).status,405);
  } finally {await new Promise(resolve=>server.close(resolve));}
});
