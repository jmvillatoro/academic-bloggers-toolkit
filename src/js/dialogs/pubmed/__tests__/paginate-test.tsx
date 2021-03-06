import { shallow } from 'enzyme';
import { observable } from 'mobx';
import * as React from 'react';
import { Paginate } from '../paginate';

const setup = (page: number, resultLength: number) => {
    const component = shallow(
        <Paginate page={observable(page)} totalPages={Math.ceil(resultLength / 5)} />,
    );
    return {
        component,
        next: component.find('#next'),
        prev: component.find('#prev'),
    };
};

describe('<Paginate />', () => {
    it('should render with "next" enabled and "previous" disabled', () => {
        const { next, prev } = setup(1, 50);
        expect(next.props().disabled).toBeFalsy();
        expect(prev.props().disabled).toBeTruthy();
    });
    it('should render with both "next" and "previous" disabled', () => {
        const { next, prev } = setup(1, 3);
        expect(next.props().disabled).toBeTruthy();
        expect(prev.props().disabled).toBeTruthy();
    });
    it('should paginate to the next page when "next" is clicked', () => {
        const { component, next } = setup(1, 25);
        next.simulate('click', { currentTarget: { id: 'next' } });
        expect(component.instance().props.page.get()).toBe(2);
    });
    it('should paginate to the previous page when "prev" is clicked', () => {
        const { component, prev } = setup(2, 25);
        expect(prev.props().disabled).toBeFalsy();
        expect(component.instance().props.page.get()).toBe(2);
        prev.simulate('click', { currentTarget: { id: 'prev' } });
        expect(component.instance().props.page.get()).toBe(1);
    });
    it('should only be able to paginate to 4 pages', () => {
        const { component, next } = setup(1, 50);
        expect(component.instance().props.page.get()).toBe(1);
        expect(next.props().disabled).toBeFalsy();
        next.simulate('click', { currentTarget: { id: 'next' } });
        next.simulate('click', { currentTarget: { id: 'next' } });
        next.simulate('click', { currentTarget: { id: 'next' } });
        expect(component.instance().props.page.get()).toBe(4);
    });
    it('should handle invalid pager ids', () => {
        const { component } = setup(1, 50);
        const instance = component.instance() as Paginate;
        expect(component.instance().props.page.get()).toBe(1);
        instance.handleClick({ currentTarget: { id: 'foo' } } as any);
        expect(component.instance().props.page.get()).toBe(1);
    });
});
